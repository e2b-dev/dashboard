'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { type CommandHandle, type Sandbox, TimeoutError } from 'e2b'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { useTRPC } from '@/trpc/client'
import { attachTerminalWithRetry } from './attach-terminal'
import {
  TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
  TERMINAL_ATTACH_MAX_RETRIES,
  TERMINAL_ATTACH_RETRY_BASE_DELAY_MS,
  TERMINAL_ATTACH_RETRY_MAX_DELAY_MS,
  TERMINAL_AUTOSTART_DEBOUNCE_MS,
} from './constants'
import DashboardTerminalCommandDialog from './dashboard-terminal-command-dialog'
import { getDefaultTerminalEnvVarNames } from './env-vars'
import { openTerminalSandbox } from './sandbox-session'
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

interface DashboardTerminalProps {
  autoStart?: boolean
  getSandbox?: TerminalSandboxResolver
  launchTarget?: TerminalLaunchTarget
  onSandboxAttached?: (sandboxId: string) => void
  onSandboxAttachFailed?: (target: TerminalLaunchTarget | undefined) => void
  sandboxManagementAuth: SandboxManagementAuth
  sandboxScoped?: boolean
  teamSlug: string
}

async function connectCreatedTerminalPty({
  appendOutput,
  pid,
  requestPtyKill,
  sandbox,
}: {
  appendOutput: (text: string | Uint8Array) => void
  pid: number
  requestPtyKill: ({
    pid,
    sandboxId,
  }: {
    pid: number
    sandboxId: string
  }) => void
  sandbox: Sandbox
}) {
  try {
    return await sandbox.pty.connect(pid, {
      timeoutMs: 0,
      requestTimeoutMs: TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
      onData: (data) => {
        appendOutput(data)
      },
    })
  } catch (error) {
    requestPtyKill({ pid, sandboxId: sandbox.sandboxId })
    throw error
  }
}

export default function DashboardTerminal({
  autoStart = false,
  getSandbox,
  launchTarget,
  onSandboxAttached,
  onSandboxAttachFailed,
  sandboxManagementAuth,
  sandboxScoped = false,
  teamSlug,
}: DashboardTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [activeSandboxId, setActiveSandboxId] = useState<string>()
  const [template, setTemplate] = useState(
    normalizeTerminalTemplate(launchTarget?.template) ?? 'base'
  )
  const [pendingLaunch, setPendingLaunch] =
    useState<PendingTerminalLaunch | null>(null)
  const trpc = useTRPC()
  const { mutateAsync: createTerminalPty } = useMutation(
    trpc.sandbox.createTerminalPty.mutationOptions()
  )
  const { mutateAsync: setTerminalEnvVar } = useMutation(
    trpc.sandbox.setTerminalEnvVar.mutationOptions()
  )
  const { data: terminalEnvVars } = useQuery(
    trpc.sandbox.terminalEnvVars.queryOptions(
      {
        sandboxId: activeSandboxId,
        teamSlug,
        template,
      },
      {
        refetchOnWindowFocus: false,
      }
    )
  )

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

      if (!sandboxScoped && url.searchParams.get('sandboxId') !== sandboxId) {
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
    [sandboxScoped]
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
          return getSandbox()
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

        return terminalSandbox.sandbox
      }

      const canRetrySandboxOpen = Boolean(requestedSandboxId || getSandbox)

      try {
        const sandbox = await attachTerminalWithRetry({
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

        if (!sandbox || !isCurrentStart()) return

        appendOutput(`Sandbox ${sandbox.sandboxId} is running.\r\n`)
        appendOutput('Opening PTY...\r\n')
        const terminalSize = resizeTerminal()
        const { pid } = await createTerminalPty({
          sandboxId: sandbox.sandboxId,
          template: nextTemplate,
          cols: terminalSize.cols,
          rows: terminalSize.rows,
          teamSlug,
        })

        if (!isCurrentStart()) {
          requestPtyKill({ pid, sandboxId: sandbox.sandboxId })
          return
        }

        const pty = await connectCreatedTerminalPty({
          appendOutput,
          pid,
          requestPtyKill,
          sandbox,
        })

        if (!isCurrentStart()) {
          try {
            await pty.kill()
          } catch {
            // The start was superseded or unmounted; best-effort PTY cleanup.
          }
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
        if (pendingCommands.length === 0) {
          sendInputToPty('\r', pty.pid)
        }
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
      sendInputToPty,
      focusTerminal,
      getSandbox,
      runCommand,
      createTerminalPty,
      requestPtyKill,
      sandboxManagementAuth,
      sandboxScoped,
      teamSlug,
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

    const { command, target: launchTarget } = pendingLaunch
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
      forceNewSandbox: !launchSandboxId && template !== launchTemplate,
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

  const handleSetEnvVar = useCallback(
    async ({ name, value }: { name: string; value: string }) => {
      if (!activeSandboxId) {
        throw new Error('Open a terminal before setting environment variables.')
      }

      await setTerminalEnvVar({
        sandboxId: activeSandboxId,
        name,
        value,
        teamSlug,
      })

      if (status === 'ready') {
        void startTerminal({
          target: {
            sandboxId: activeSandboxId,
            template,
          },
        })
      }
    },
    [
      activeSandboxId,
      setTerminalEnvVar,
      startTerminal,
      status,
      teamSlug,
      template,
    ]
  )

  useEffect(() => {
    if (!autoStart || status !== 'idle' || isStartingRef.current) return

    const autoStartTimer = window.setTimeout(() => {
      if (isStartingRef.current || ptyRef.current) return

      queueTerminalCommand(launchTarget?.command ?? '', {
        target: launchTarget,
      })
    }, TERMINAL_AUTOSTART_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(autoStartTimer)
    }
  }, [autoStart, launchTarget, queueTerminalCommand, status])

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

  return (
    <>
      <TerminalPanel
        predefinedEnvVarNames={
          terminalEnvVars?.names ?? getDefaultTerminalEnvVarNames(template)
        }
        sandboxId={activeSandboxId}
        envVarTemplate={terminalEnvVars?.template ?? template}
        restartDisabled={restartDisabled}
        restartLabel={restartLabel}
        template={sandboxScoped ? undefined : template}
        terminalContainerRef={terminalContainerRef}
        onFocusTerminal={focusTerminal}
        onCopyTerminalText={() => void copyTerminalText()}
        onRestartTerminal={restartTerminal}
        onSetEnvVar={handleSetEnvVar}
      />

      <DashboardTerminalCommandDialog
        launch={pendingLaunch}
        onCancel={() => setPendingLaunch(null)}
        onConfirm={confirmPendingLaunch}
      />
    </>
  )
}
