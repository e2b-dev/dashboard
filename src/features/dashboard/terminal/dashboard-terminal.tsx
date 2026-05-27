'use client'
import { type CommandHandle, type Sandbox, TimeoutError } from 'e2b'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CWD,
  TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS,
  TERMINAL_ATTACH_RETRY_DELAYS_MS,
  TERMINAL_AUTOSTART_DEBOUNCE_MS,
} from './constants'
import DashboardTerminalCommandDialog from './dashboard-terminal-command-dialog'
import { openTerminalSandbox } from './sandbox-session'
import {
  normalizeTerminalTemplate,
  resolveTerminalTemplateOverride,
} from './template'
import TerminalPanel from './terminal-panel'
import type {
  PendingTerminalLaunch,
  StartTerminalOptions,
  TerminalStatus,
} from './types'
import { useTerminalInstance } from './use-terminal-instance'

interface DashboardTerminalProps {
  autoStart?: boolean
  initialCommand?: string
  initialSandboxId?: string
  initialTemplate?: string
  sandboxScoped?: boolean
  teamId: string
}

export default function DashboardTerminal({
  autoStart = false,
  initialCommand = '',
  initialSandboxId,
  initialTemplate,
  sandboxScoped = false,
  teamId,
}: DashboardTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [activeSandboxId, setActiveSandboxId] = useState<string>()
  const [template, setTemplate] = useState(
    normalizeTerminalTemplate(initialTemplate) ?? 'base'
  )
  const [pendingLaunch, setPendingLaunch] =
    useState<PendingTerminalLaunch | null>(null)

  const sandboxRef = useRef<Sandbox | null>(null)
  const ptyRef = useRef<CommandHandle | null>(null)
  const pidRef = useRef<number | undefined>(undefined)
  const pendingCommandsRef = useRef<string[]>([])
  const inputQueueRef = useRef(Promise.resolve())
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

  const sendInputToPty = useCallback(
    (value: string | Uint8Array, terminalPid = pidRef.current) => {
      if (!value || !sandboxRef.current || !terminalPid) return

      const sandbox = sandboxRef.current
      const data =
        typeof value === 'string' ? new TextEncoder().encode(value) : value

      inputQueueRef.current = inputQueueRef.current
        .catch(() => undefined)
        .then(() => sandbox.pty.sendInput(terminalPid, data))
    },
    []
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

  const disconnectTerminal = useCallback(async () => {
    clearAttachRetryTimer()

    const pty = ptyRef.current
    ptyRef.current = null
    inputQueueRef.current = Promise.resolve()
    if (!pty) return

    try {
      await pty.disconnect()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive to pause.
    }
  }, [clearAttachRetryTimer])

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
      const nextTemplate = resolveTerminalTemplateOverride(
        options.template,
        template
      )

      if (!nextTemplate) {
        setStatus('error')
        appendOutput('Invalid terminal template.\r\n')
        return
      }

      isStartingRef.current = true
      const startGeneration = startGenerationRef.current + 1
      startGenerationRef.current = startGeneration
      const isCurrentStart = () =>
        startGenerationRef.current === startGeneration

      await disconnectTerminal()
      sandboxRef.current = null
      pidRef.current = undefined
      inputQueueRef.current = Promise.resolve()
      resetTerminal()
      setStatus('starting')
      setActiveSandboxId(options.sandboxId)
      setTemplate(nextTemplate)
      appendOutput('Opening terminal...\r\n')

      const openSandboxAndPty = async () => {
        const { sandbox } = await openTerminalSandbox({
          forceNewSandbox: options.forceNewSandbox,
          onStatus: appendOutput,
          requestTimeoutMs: options.sandboxId
            ? TERMINAL_ATTACH_ATTEMPT_TIMEOUT_MS
            : undefined,
          shouldStoreSession: !sandboxScoped,
          sandboxId: options.sandboxId,
          teamId,
          template: nextTemplate,
        })

        if (!isCurrentStart()) return null

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

        return { pty, sandbox }
      }

      const canRetryAttach = Boolean(options.sandboxId)

      try {
        type AttachResult = NonNullable<
          Awaited<ReturnType<typeof openSandboxAndPty>>
        >
        let attachAttempt = 0
        let sandbox: AttachResult['sandbox']
        let pty: AttachResult['pty']

        while (true) {
          try {
            const result = await openSandboxAndPty()
            if (!result) return
            sandbox = result.sandbox
            pty = result.pty
            break
          } catch (error) {
            const retryDelay = TERMINAL_ATTACH_RETRY_DELAYS_MS[attachAttempt]
            if (
              !canRetryAttach ||
              !retryDelay ||
              !isCurrentStart() ||
              !(error instanceof TimeoutError)
            ) {
              throw error
            }

            attachAttempt += 1
            appendOutput(
              `Terminal attach timed out. Retrying in ${Math.round(
                retryDelay / 1000
              )}s...\r\n`
            )
            await waitForAttachRetry(retryDelay)

            if (!isCurrentStart()) return
          }
        }

        if (!isCurrentStart()) {
          try {
            await pty.disconnect()
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

        const pendingCommands = pendingCommandsRef.current
        pendingCommandsRef.current = []
        for (const command of pendingCommands) {
          runCommand(command, pty.pid)
        }
      } catch (error) {
        if (!isCurrentStart()) return

        setStatus('error')
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
      disconnectTerminal,
      resizeTerminal,
      resetTerminal,
      focusTerminal,
      runCommand,
      sandboxScoped,
      teamId,
      template,
      updateTerminalUrl,
      waitForAttachRetry,
    ]
  )

  const queueTerminalCommand = useCallback(
    (command: string, options: StartTerminalOptions = {}) => {
      const nextTemplate = resolveTerminalTemplateOverride(
        options.template,
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
          sandboxId: options.sandboxId,
          template: nextTemplate,
        })
        return
      }

      if (status === 'idle' || status === 'error' || options.forceNewSandbox) {
        void startTerminal({
          ...options,
          template: nextTemplate,
        })
      }
    },
    [appendOutput, startTerminal, status, template]
  )

  const confirmPendingLaunch = useCallback(() => {
    if (!pendingLaunch) return

    const {
      command,
      sandboxId: launchSandboxId,
      template: launchTemplate,
    } = pendingLaunch

    if (
      status === 'ready' &&
      template === launchTemplate &&
      (!launchSandboxId || activeSandboxId === launchSandboxId)
    ) {
      setPendingLaunch(null)
      runCommand(command)
      if (activeSandboxId) {
        updateTerminalUrl({ clearCommand: true, sandboxId: activeSandboxId })
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
      sandboxId: launchSandboxId,
      template: launchTemplate,
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

  const reconnectSandboxId = sandboxScoped ? initialSandboxId : activeSandboxId
  const restartLabel = sandboxScoped
    ? 'Reconnect terminal'
    : 'Start new terminal sandbox'
  const restartDisabled =
    status === 'starting' || (sandboxScoped && !reconnectSandboxId)

  const restartTerminal = useCallback(() => {
    if (sandboxScoped) {
      if (!reconnectSandboxId) return

      void startTerminal({ sandboxId: reconnectSandboxId })
      return
    }

    void startTerminal({ forceNewSandbox: true })
  }, [reconnectSandboxId, sandboxScoped, startTerminal])

  useEffect(() => {
    if (!autoStart || status !== 'idle' || isStartingRef.current) return

    const autoStartTimer = window.setTimeout(() => {
      if (isStartingRef.current || ptyRef.current) return

      queueTerminalCommand(initialCommand, {
        sandboxId: initialSandboxId,
        template: initialTemplate,
      })
    }, TERMINAL_AUTOSTART_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(autoStartTimer)
    }
  }, [
    autoStart,
    initialCommand,
    initialSandboxId,
    initialTemplate,
    queueTerminalCommand,
    status,
  ])

  useEffect(() => {
    return () => {
      startGenerationRef.current += 1
      clearAttachRetryTimer()
      void disconnectTerminal()
    }
  }, [clearAttachRetryTimer, disconnectTerminal])

  return (
    <>
      <TerminalPanel
        sandboxId={activeSandboxId}
        restartDisabled={restartDisabled}
        restartLabel={restartLabel}
        template={sandboxScoped ? undefined : template}
        terminalContainerRef={terminalContainerRef}
        onFocusTerminal={focusTerminal}
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
