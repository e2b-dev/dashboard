'use client'

import '@xterm/xterm/css/xterm.css'
import { Terminal as XTerm } from '@xterm/xterm'
import { type CommandHandle, type Sandbox, TimeoutError } from 'e2b'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_COLS,
  DEFAULT_CWD,
  DEFAULT_ROWS,
  MAX_TERMINAL_TRANSCRIPT_CHARS,
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
import { calculateTerminalSize } from './terminal-size'
import type {
  PendingTerminalLaunch,
  StartTerminalOptions,
  TerminalStatus,
} from './types'

const INITIAL_TERMINAL_TEXT =
  'Open a terminal to start a persistent E2B sandbox.\r\n'
const TERMINAL_THEME = {
  background: '#000000',
  cursor: '#ffffff',
  foreground: '#ffffff',
  selectionBackground: '#ffffff40',
}

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
  const xtermRef = useRef<XTerm | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement | null>(null)
  const terminalTranscriptRef = useRef(INITIAL_TERMINAL_TEXT)
  const terminalSizeRef = useRef({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
  const decoderRef = useRef(new TextDecoder())
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

  const resizeTerminal = useCallback(() => {
    const nextSize = calculateTerminalSize(
      terminalContainerRef.current,
      xtermRef.current
    )
    terminalSizeRef.current = nextSize
    xtermRef.current?.resize(nextSize.cols, nextSize.rows)

    if (sandboxRef.current && pidRef.current) {
      void sandboxRef.current.pty.resize(pidRef.current, nextSize)
    }

    return nextSize
  }, [])

  const appendOutput = useCallback((chunk: string | Uint8Array) => {
    const text =
      typeof chunk === 'string'
        ? chunk
        : decoderRef.current.decode(chunk, { stream: true })

    terminalTranscriptRef.current = (
      terminalTranscriptRef.current + text
    ).slice(-MAX_TERMINAL_TRANSCRIPT_CHARS)
    xtermRef.current?.write(chunk, () => {
      xtermRef.current?.scrollToBottom()
    })
  }, [])

  const disconnectTerminal = useCallback(async () => {
    clearAttachRetryTimer()

    const pty = ptyRef.current
    ptyRef.current = null
    if (!pty) return

    try {
      await pty.disconnect()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive to pause.
    }
  }, [clearAttachRetryTimer])

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
      decoderRef.current = new TextDecoder()
      inputQueueRef.current = Promise.resolve()
      terminalTranscriptRef.current = ''
      xtermRef.current?.reset()
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
        xtermRef.current?.focus()

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

  const copyTerminalText = async () => {
    const value =
      xtermRef.current?.getSelection() || terminalTranscriptRef.current
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
    } catch {
      appendOutput('\r\nCould not copy terminal output to clipboard.\r\n')
    } finally {
      xtermRef.current?.focus()
    }
  }

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

  useEffect(() => {
    const container = terminalContainerRef.current
    if (!container) return

    const terminal = new XTerm({
      cols: terminalSizeRef.current.cols,
      rows: terminalSizeRef.current.rows,
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.54,
      scrollback: 10_000,
      theme: TERMINAL_THEME,
    })

    xtermRef.current = terminal
    terminal.open(container)
    terminal.write(terminalTranscriptRef.current)
    const dataSubscription = terminal.onData((data) => {
      sendInputToPty(data)
    })

    requestAnimationFrame(() => {
      resizeTerminal()
      terminal.focus()
    })
    const resizeTimer = window.setTimeout(() => {
      resizeTerminal()
    }, 100)

    return () => {
      window.clearTimeout(resizeTimer)
      dataSubscription.dispose()
      terminal.dispose()
      if (xtermRef.current === terminal) {
        xtermRef.current = null
      }
    }
  }, [resizeTerminal, sendInputToPty])

  useEffect(() => {
    const container = terminalContainerRef.current
    const resizeObserver =
      container && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            resizeTerminal()
          })
        : null

    if (container) {
      resizeObserver?.observe(container)
    }

    const handleWindowResize = () => {
      resizeTerminal()
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [resizeTerminal])

  return (
    <>
      <TerminalPanel
        sandboxId={activeSandboxId}
        restartDisabled={restartDisabled}
        restartLabel={restartLabel}
        template={sandboxScoped ? undefined : template}
        terminalContainerRef={terminalContainerRef}
        onFocusTerminal={() => xtermRef.current?.focus()}
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
