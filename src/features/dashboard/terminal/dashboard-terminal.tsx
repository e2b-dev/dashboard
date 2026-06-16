'use client'

import { type CommandHandle, type Sandbox, TimeoutError } from 'e2b'
import type { PointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { attachTerminalWithRetry } from './attach-terminal'
import {
  DEFAULT_CWD,
  TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
  TERMINAL_ATTACH_MAX_RETRIES,
  TERMINAL_ATTACH_RETRY_BASE_DELAY_MS,
  TERMINAL_ATTACH_RETRY_MAX_DELAY_MS,
  TERMINAL_AUTOSTART_DEBOUNCE_MS,
} from './constants'
import DashboardTerminalCommandDialog from './dashboard-terminal-command-dialog'
import { openTerminalSandbox } from './sandbox-session'
import { clearStoredTerminalSession } from './storage'
import {
  normalizeTerminalTemplate,
  resolveTerminalTemplateOverride,
} from './template'
import TerminalPanel from './terminal-panel'
import type {
  PendingTerminalLaunch,
  StartTerminalOptions,
  TerminalLaunchTarget,
  TerminalSandboxResolver,
  TerminalStatus,
} from './types'
import { useTerminalInstance } from './use-terminal-instance'

const FLUSH_INPUT_INTERVAL_MS = 0
const FLUSH_INPUT_RETRY_INTERVAL_MS = 250
const MAX_INPUT_FLUSH_RETRIES = 2

async function killAbortedStartupSandbox({
  created,
  sandbox,
  userId,
}: {
  created: boolean
  sandbox: Sandbox
  userId: string
}) {
  if (!created) return

  clearStoredTerminalSession(userId)

  try {
    await sandbox.kill()
  } catch {
    // The start was superseded or unmounted; best-effort sandbox cleanup.
  }
}

interface DashboardTerminalProps {
  autoStart?: boolean
  backHref?: string
  forceNewSandbox?: boolean
  getSandbox?: TerminalSandboxResolver
  isWindowMinimized?: boolean
  launchTarget?: TerminalLaunchTarget
  onSandboxAttached?: (sandboxId: string) => void
  onSandboxAttachFailed?: (target: TerminalLaunchTarget | undefined) => void
  onWindowClose?: () => void
  onWindowDragStart?: (event: PointerEvent<HTMLDivElement>) => void
  onWindowMinimize?: () => void
  sandboxManagementAuth: SandboxManagementAuth
  sandboxScoped?: boolean
  syncUrl?: boolean
  teamSlug: string
}

export default function DashboardTerminal({
  autoStart = false,
  backHref,
  forceNewSandbox = false,
  getSandbox,
  isWindowMinimized = false,
  launchTarget,
  onSandboxAttached,
  onSandboxAttachFailed,
  onWindowClose,
  onWindowDragStart,
  onWindowMinimize,
  sandboxManagementAuth,
  sandboxScoped = false,
  syncUrl = true,
  teamSlug,
}: DashboardTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [activeSandboxId, setActiveSandboxId] = useState<string>()
  const [template, setTemplate] = useState(
    normalizeTerminalTemplate(launchTarget?.template) ?? 'base'
  )
  const [pendingLaunch, setPendingLaunch] =
    useState<PendingTerminalLaunch | null>(null)

  const sandboxRef = useRef<Sandbox | null>(null)
  const ptyRef = useRef<CommandHandle | null>(null)
  const pidRef = useRef<number | undefined>(undefined)
  const pendingInputRef = useRef<Uint8Array[]>([])
  const inputFlushTimerRef = useRef<number | null>(null)
  const inputFlushInFlightRef = useRef(false)
  const inputFlushRetryCountRef = useRef(0)
  const inputGenerationRef = useRef(0)
  const pendingCommandsRef = useRef<string[]>([])
  const isStartingRef = useRef(false)
  const retryResolveRef = useRef<(() => void) | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const startGenerationRef = useRef(0)

  const clearAttachRetryTimer = useCallback(() => {
    if (!retryTimerRef.current) return

    window.clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
    retryResolveRef.current?.()
    retryResolveRef.current = null
  }, [])

  const waitForAttachRetry = useCallback(
    (delayMs: number) =>
      new Promise<void>((resolve) => {
        retryResolveRef.current = resolve
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null
          retryResolveRef.current = null
          resolve()
        }, delayMs)
      }),
    []
  )

  const abortCurrentStart = useCallback(() => {
    startGenerationRef.current += 1
    isStartingRef.current = false
    if (!ptyRef.current) {
      setStatus('idle')
    }
  }, [])

  const requestPtyKill = useCallback(
    ({ pid, sandboxId }: { pid: number; sandboxId: string }) => {
      void fetch('/api/trpc/sandbox.killTerminalPty?batch=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          0: {
            json: {
              pid,
              sandboxId,
              teamSlug,
            },
          },
        }),
        keepalive: true,
      })
    },
    [teamSlug]
  )

  const clearPendingInput = useCallback(() => {
    if (inputFlushTimerRef.current) {
      window.clearTimeout(inputFlushTimerRef.current)
      inputFlushTimerRef.current = null
    }
    inputGenerationRef.current += 1
    inputFlushInFlightRef.current = false
    inputFlushRetryCountRef.current = 0
    pendingInputRef.current = []
  }, [])

  const flushInputToPty = useCallback((terminalPid = pidRef.current) => {
    inputFlushTimerRef.current = null

    if (inputFlushInFlightRef.current) return

    if (!sandboxRef.current || !terminalPid) {
      pendingInputRef.current = []
      return
    }

    const pendingInput = pendingInputRef.current
    pendingInputRef.current = []
    if (!pendingInput.length) return

    const byteLength = pendingInput.reduce(
      (total, chunk) => total + chunk.byteLength,
      0
    )
    const data = new Uint8Array(byteLength)
    let offset = 0
    for (const chunk of pendingInput) {
      data.set(chunk, offset)
      offset += chunk.byteLength
    }

    const sandbox = sandboxRef.current
    const inputGeneration = inputGenerationRef.current
    inputFlushInFlightRef.current = true
    let shouldRetryPendingInput = false

    void sandbox.pty
      .sendInput(terminalPid, data)
      .then(() => {
        inputFlushRetryCountRef.current = 0
      })
      .catch(() => {
        if (inputGenerationRef.current !== inputGeneration) return
        if (pidRef.current !== terminalPid) return
        if (inputFlushRetryCountRef.current >= MAX_INPUT_FLUSH_RETRIES) return

        inputFlushRetryCountRef.current += 1
        shouldRetryPendingInput = true
        pendingInputRef.current = [data, ...pendingInputRef.current]
      })
      .finally(() => {
        if (inputGenerationRef.current !== inputGeneration) return

        inputFlushInFlightRef.current = false

        if (pidRef.current === terminalPid && pendingInputRef.current.length) {
          if (shouldRetryPendingInput) {
            inputFlushTimerRef.current = window.setTimeout(() => {
              flushInputToPty(terminalPid)
            }, FLUSH_INPUT_RETRY_INTERVAL_MS)
            return
          }

          flushInputToPty(terminalPid)
        }
      })
  }, [])

  const sendInputToPty = useCallback(
    (value: string | Uint8Array, terminalPid = pidRef.current) => {
      if (!value || !sandboxRef.current || !terminalPid) return

      const data =
        typeof value === 'string' ? new TextEncoder().encode(value) : value

      pendingInputRef.current.push(data)

      if (inputFlushTimerRef.current) return

      inputFlushTimerRef.current = window.setTimeout(() => {
        flushInputToPty(terminalPid)
      }, FLUSH_INPUT_INTERVAL_MS)
    },
    [flushInputToPty]
  )

  const resizePty = useCallback((size: { cols: number; rows: number }) => {
    if (sandboxRef.current && pidRef.current) {
      void sandboxRef.current.pty.resize(pidRef.current, size)
    }
  }, [])

  const {
    appendOutput,
    copyTerminalText,
    focusTerminal,
    resetTerminal,
    resizeTerminal,
    terminalContainerRef,
  } = useTerminalInstance({
    onInput: sendInputToPty,
    onResize: resizePty,
  })

  const closeTerminal = useCallback(async () => {
    clearAttachRetryTimer()
    clearPendingInput()

    const pty = ptyRef.current
    const sandboxId = sandboxRef.current?.sandboxId
    ptyRef.current = null
    pidRef.current = undefined
    if (!pty) return

    if (sandboxId) {
      requestPtyKill({ pid: pty.pid, sandboxId })
    }

    try {
      await pty.kill()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive.
    }
  }, [clearAttachRetryTimer, clearPendingInput, requestPtyKill])

  const runCommand = useCallback(
    (command: string, terminalPid?: number) => {
      const normalizedCommand = command.trim()
      if (!normalizedCommand) return

      sendInputToPty(`${normalizedCommand}\r`, terminalPid)
    },
    [sendInputToPty]
  )

  const updateTerminalUrl = useCallback(
    ({
      clearCommand = false,
      sandboxId,
    }: {
      clearCommand?: boolean
      sandboxId: string
    }) => {
      const url = new URL(window.location.href)
      let changed = false

      if (
        syncUrl &&
        !sandboxScoped &&
        url.searchParams.get('sandboxId') !== sandboxId
      ) {
        url.searchParams.set('sandboxId', sandboxId)
        changed = true
      }

      if (clearCommand && url.searchParams.has('command')) {
        url.searchParams.delete('command')
        changed = true
      }

      if (changed) {
        window.history.replaceState(window.history.state, '', url)
      }
    },
    [sandboxScoped, syncUrl]
  )

  const startTerminal = useCallback(
    async (options: StartTerminalOptions = {}) => {
      if (isStartingRef.current) return
      const target = options.target
      const nextTemplate = resolveTerminalTemplateOverride(
        target?.template,
        template
      )

      if (!nextTemplate) {
        setStatus('error')
        appendOutput('Invalid terminal template.\r\n')
        return
      }

      const requestedSandboxId = target?.sandboxId
      isStartingRef.current = true
      const startGeneration = startGenerationRef.current + 1
      startGenerationRef.current = startGeneration
      const isCurrentStart = () =>
        startGenerationRef.current === startGeneration

      await closeTerminal()
      sandboxRef.current = null
      pidRef.current = undefined
      resetTerminal()
      setStatus('starting')
      setActiveSandboxId(requestedSandboxId)
      setTemplate(nextTemplate)
      appendOutput('Opening terminal...\r\n')

      const openSandbox = async () => {
        if (getSandbox) {
          appendOutput('Connecting to sandbox...\r\n')
          const sandbox = await getSandbox()
          return { created: false, sandbox }
        }

        const terminalSandbox = await openTerminalSandbox({
          forceNewSandbox: options.forceNewSandbox,
          onStatus: appendOutput,
          requestTimeoutMs: requestedSandboxId
            ? TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS
            : undefined,
          sandboxManagementAuth,
          shouldStoreSession: !sandboxScoped,
          sandboxId: requestedSandboxId,
          template: nextTemplate,
        })

        return terminalSandbox
      }

      const canRetrySandboxOpen = Boolean(requestedSandboxId || getSandbox)

      try {
        const terminalSandbox = await attachTerminalWithRetry({
          canRetry: canRetrySandboxOpen,
          isCurrent: isCurrentStart,
          isRetryableError: (error) => error instanceof TimeoutError,
          maxRetries: TERMINAL_ATTACH_MAX_RETRIES,
          onRetry: (retryDelay) => {
            appendOutput(
              `Sandbox connection timed out. Retrying in ${Math.round(
                retryDelay / 1000
              )}s...\r\n`
            )
          },
          open: openSandbox,
          retryBaseDelayMs: TERMINAL_ATTACH_RETRY_BASE_DELAY_MS,
          retryMaxDelayMs: TERMINAL_ATTACH_RETRY_MAX_DELAY_MS,
          waitForRetry: waitForAttachRetry,
        })

        if (!terminalSandbox) return

        const { created, sandbox } = terminalSandbox

        if (!isCurrentStart()) {
          await killAbortedStartupSandbox({
            created,
            sandbox,
            userId: sandboxManagementAuth.userId,
          })
          return
        }

        appendOutput(`Sandbox ${sandbox.sandboxId} is running.\r\n`)
        appendOutput('Opening PTY...\r\n')
        const terminalSize = resizeTerminal()
        const pty = await sandbox.pty.create({
          cols: terminalSize.cols,
          rows: terminalSize.rows,
          timeoutMs: 0,
          requestTimeoutMs: TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
          cwd: DEFAULT_CWD,
          onData: (data) => {
            appendOutput(data)
          },
        })

        if (!isCurrentStart()) {
          try {
            await pty.kill()
          } catch {
            // The start was superseded or unmounted; best-effort PTY cleanup.
          }
          await killAbortedStartupSandbox({
            created,
            sandbox,
            userId: sandboxManagementAuth.userId,
          })
          return
        }

        sandboxRef.current = sandbox
        setActiveSandboxId(sandbox.sandboxId)
        updateTerminalUrl({
          // Keep ?command= until the confirmed command has an attached sandbox.
          clearCommand: pendingCommandsRef.current.length > 0,
          sandboxId: sandbox.sandboxId,
        })
        ptyRef.current = pty
        pidRef.current = pty.pid
        resizeTerminal()
        setStatus('ready')
        appendOutput(`PTY ${pty.pid} attached.\r\n`)
        focusTerminal()
        onSandboxAttached?.(sandbox.sandboxId)

        const pendingCommands = pendingCommandsRef.current
        pendingCommandsRef.current = []
        for (const command of pendingCommands) {
          runCommand(command, pty.pid)
        }
      } catch (error) {
        if (!isCurrentStart()) return

        setStatus('error')
        onSandboxAttachFailed?.(target)
        appendOutput(
          `\r\nFailed to start terminal: ${
            error instanceof Error ? error.message : 'Unknown error'
          }\r\n`
        )
      } finally {
        if (isCurrentStart()) {
          isStartingRef.current = false
        }
      }
    },
    [
      appendOutput,
      closeTerminal,
      resizeTerminal,
      resetTerminal,
      focusTerminal,
      getSandbox,
      runCommand,
      sandboxManagementAuth,
      sandboxScoped,
      template,
      onSandboxAttached,
      onSandboxAttachFailed,
      updateTerminalUrl,
      waitForAttachRetry,
    ]
  )

  const queueTerminalCommand = useCallback(
    (command: string, options: StartTerminalOptions = {}) => {
      const nextTemplate = resolveTerminalTemplateOverride(
        options.target?.template,
        template
      )

      if (!nextTemplate) {
        setStatus('error')
        appendOutput('Invalid terminal template.\r\n')
        return
      }

      if (command.trim()) {
        // Commands can come from links, so require an explicit click before
        // sending anything into the PTY.
        setPendingLaunch({
          command: command.trim(),
          forceNewSandbox: options.forceNewSandbox,
          target: {
            ...options.target,
            template: nextTemplate,
          },
        })
        return
      }

      if (status === 'idle' || status === 'error' || options.forceNewSandbox) {
        void startTerminal({
          ...options,
          target: {
            ...options.target,
            template: nextTemplate,
          },
        })
      }
    },
    [appendOutput, startTerminal, status, template]
  )

  const confirmPendingLaunch = useCallback(() => {
    if (!pendingLaunch) return

    const {
      command,
      forceNewSandbox: pendingForceNewSandbox,
      target: launchTarget,
    } = pendingLaunch
    const launchTemplate = launchTarget?.template ?? 'base'
    const launchSandboxId = launchTarget?.sandboxId

    if (
      status === 'ready' &&
      template === launchTemplate &&
      (!launchSandboxId || activeSandboxId === launchSandboxId)
    ) {
      setPendingLaunch(null)
      runCommand(command)
      if (activeSandboxId) {
        updateTerminalUrl({
          clearCommand: true,
          sandboxId: activeSandboxId,
        })
      }
      return
    }

    if (isStartingRef.current) {
      return
    }

    setPendingLaunch(null)
    pendingCommandsRef.current = [command]
    void startTerminal({
      forceNewSandbox:
        pendingForceNewSandbox ??
        (!launchSandboxId && template !== launchTemplate),
      target: launchTarget,
    })
  }, [
    activeSandboxId,
    pendingLaunch,
    runCommand,
    startTerminal,
    status,
    template,
    updateTerminalUrl,
  ])

  const reconnectTarget = sandboxScoped
    ? launchTarget
    : activeSandboxId
      ? { sandboxId: activeSandboxId, template }
      : undefined
  const reconnectSandboxId = sandboxScoped
    ? launchTarget?.sandboxId
    : activeSandboxId
  const restartLabel = sandboxScoped
    ? 'Reconnect terminal'
    : 'Start new terminal sandbox'
  const restartDisabled =
    status === 'starting' ||
    (sandboxScoped && !reconnectSandboxId && !getSandbox)

  const restartTerminal = useCallback(() => {
    if (sandboxScoped) {
      if (!reconnectSandboxId && !getSandbox) return

      void startTerminal({
        target: reconnectTarget,
      })
      return
    }

    void startTerminal({ forceNewSandbox: true })
  }, [
    getSandbox,
    reconnectTarget,
    reconnectSandboxId,
    sandboxScoped,
    startTerminal,
  ])

  useEffect(() => {
    if (!autoStart || status !== 'idle' || isStartingRef.current) return

    const autoStartTimer = window.setTimeout(() => {
      if (isStartingRef.current || ptyRef.current) return

      queueTerminalCommand(launchTarget?.command ?? '', {
        forceNewSandbox,
        target: launchTarget,
      })
    }, TERMINAL_AUTOSTART_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(autoStartTimer)
    }
  }, [autoStart, forceNewSandbox, launchTarget, queueTerminalCommand, status])

  useEffect(() => {
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return

      abortCurrentStart()
      void closeTerminal()
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !ptyRef.current) return

      resizeTerminal()
      focusTerminal()
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
      abortCurrentStart()
      clearAttachRetryTimer()
      clearPendingInput()
      void closeTerminal()
    }
  }, [
    abortCurrentStart,
    clearAttachRetryTimer,
    clearPendingInput,
    closeTerminal,
    focusTerminal,
    resizeTerminal,
  ])

  useEffect(() => {
    if (isWindowMinimized) return

    resizeTerminal()
    focusTerminal()
  }, [focusTerminal, isWindowMinimized, resizeTerminal])

  return (
    <>
      <TerminalPanel
        backHref={backHref}
        collapsed={isWindowMinimized}
        sandboxId={activeSandboxId}
        restartDisabled={restartDisabled}
        restartLabel={restartLabel}
        template={sandboxScoped ? undefined : template}
        terminalContainerRef={terminalContainerRef}
        onClose={onWindowClose}
        onFocusTerminal={focusTerminal}
        onHeaderPointerDown={onWindowDragStart}
        onMinimize={onWindowMinimize}
        onCopyTerminalText={() => void copyTerminalText()}
        onRestartTerminal={restartTerminal}
      />

      <DashboardTerminalCommandDialog
        launch={pendingLaunch}
        onCancel={() => setPendingLaunch(null)}
        onConfirm={confirmPendingLaunch}
      />
    </>
  )
}
