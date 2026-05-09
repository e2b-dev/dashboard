'use client'

import { Terminal as XTerm } from '@xterm/xterm'
import type Sandbox from 'e2b'
import type { CommandHandle } from 'e2b'
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Button } from '@/ui/primitives/button'
import { SpinnerIcon, TerminalCustomIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../context'
import {
  DEFAULT_COLS,
  DEFAULT_CWD,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_ROWS,
  MAX_PANEL_HEIGHT_RATIO,
  MIN_PANEL_HEIGHT,
} from './constants'
import DashboardTerminalCommandDialog from './dashboard-terminal-command-dialog'
import DashboardTerminalPanel from './dashboard-terminal-panel'
import { DASHBOARD_TERMINAL_COMMAND_EVENT } from './events'
import { openTerminalSandbox } from './sandbox-session'
import { normalizeTerminalTemplate } from './template'
import { calculateTerminalSize } from './terminal-size'
import type {
  DashboardTerminalCommandDetail,
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
  initialTemplate?: string
  variant?: 'button' | 'embedded'
}

export default function DashboardTerminal({
  autoStart = false,
  initialCommand = '',
  initialTemplate,
  variant = 'button',
}: DashboardTerminalProps) {
  const { team } = useDashboard()
  const isEmbedded = variant === 'embedded'
  const [isOpen, setIsOpen] = useState(isEmbedded)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string>()
  const [template, setTemplate] = useState(
    normalizeTerminalTemplate(initialTemplate) ?? 'base'
  )
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
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
  const didAutoStartRef = useRef(false)
  const resizeStartRef = useRef<{
    pointerY: number
    panelHeight: number
  } | null>(null)

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

    terminalTranscriptRef.current += text
    xtermRef.current?.write(chunk, () => {
      xtermRef.current?.scrollToBottom()
    })
  }, [])

  const disconnectTerminal = async () => {
    const pty = ptyRef.current
    ptyRef.current = null
    if (!pty) return

    try {
      await pty.disconnect()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive to pause.
    }
  }

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

  const startTerminal = async (options: StartTerminalOptions = {}) => {
    if (status === 'starting') return

    const nextTemplate = normalizeTerminalTemplate(options.template) ?? template
    await disconnectTerminal()
    sandboxRef.current = null
    pidRef.current = undefined
    decoderRef.current = new TextDecoder()
    inputQueueRef.current = Promise.resolve()
    terminalTranscriptRef.current = ''
    xtermRef.current?.reset()
    setStatus('starting')
    setSandboxId(undefined)
    setTemplate(nextTemplate)
    appendOutput('Opening terminal...\r\n')

    try {
      const { sandbox } = await openTerminalSandbox({
        forceNewSandbox: options.forceNewSandbox,
        onStatus: appendOutput,
        teamId: team.id,
        template: nextTemplate,
      })

      sandboxRef.current = sandbox
      setSandboxId(sandbox.sandboxId)
      appendOutput(`Sandbox ${sandbox.sandboxId} is running.\r\n`)

      appendOutput('Opening PTY...\r\n')
      const terminalSize = resizeTerminal()
      const pty = await sandbox.pty.create({
        cols: terminalSize.cols,
        rows: terminalSize.rows,
        timeoutMs: 0,
        cwd: DEFAULT_CWD,
        onData: (data) => {
          appendOutput(data)
        },
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
      setStatus('error')
      appendOutput(
        `\r\nFailed to start terminal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }\r\n`
      )
    }
  }

  const openTerminal = () => {
    setIsOpen(true)
    if (status === 'idle' || status === 'error') {
      void startTerminal()
    }
  }

  const queueTerminalCommand = (
    command: string,
    options: StartTerminalOptions = {}
  ) => {
    const nextTemplate = normalizeTerminalTemplate(options.template)

    if (!nextTemplate) {
      setIsOpen(true)
      setStatus('error')
      appendOutput('Invalid terminal template.\r\n')
      return
    }

    setIsOpen(true)
    if (command.trim()) {
      setPendingLaunch({
        command: command.trim(),
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
  }

  const confirmPendingLaunch = () => {
    if (!pendingLaunch) return

    const { command, template: launchTemplate } = pendingLaunch
    setPendingLaunch(null)

    if (status === 'ready' && template === launchTemplate) {
      runCommand(command)
      return
    }

    pendingCommandsRef.current = [command]
    void startTerminal({
      forceNewSandbox: template !== launchTemplate,
      template: launchTemplate,
    })
  }

  const copyTerminalText = async () => {
    const value =
      xtermRef.current?.getSelection() || terminalTranscriptRef.current
    if (!value) return

    await navigator.clipboard.writeText(value)
    xtermRef.current?.focus()
  }

  const resizePanel = (pointerY: number) => {
    const resizeStart = resizeStartRef.current
    if (!resizeStart) return

    const maxHeight = Math.floor(window.innerHeight * MAX_PANEL_HEIGHT_RATIO)
    const delta = resizeStart.pointerY - pointerY
    const nextHeight = Math.min(
      Math.max(resizeStart.panelHeight + delta, MIN_PANEL_HEIGHT),
      maxHeight
    )

    setPanelHeight(nextHeight)
  }

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeStartRef.current = {
      pointerY: event.clientY,
      panelHeight,
    }
  }

  const stopResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resizeStartRef.current = null
    resizeTerminal()
  }

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (!autoStart || didAutoStartRef.current) return

    didAutoStartRef.current = true
    queueTerminalCommand(initialCommand, {
      template: initialTemplate,
    })
  })

  useEffect(() => {
    const container = terminalContainerRef.current
    if (!isOpen || !container) return

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
  }, [isOpen, resizeTerminal, sendInputToPty])

  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen, resizeTerminal])

  useEffect(() => {
    const handleTerminalCommand = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTerminalCommandDetail>)
        .detail

      queueTerminalCommand(detail?.command ?? '', {
        forceNewSandbox: detail?.forceNewSandbox,
        template: detail?.template,
      })
    }

    window.addEventListener(
      DASHBOARD_TERMINAL_COMMAND_EVENT,
      handleTerminalCommand
    )

    return () => {
      window.removeEventListener(
        DASHBOARD_TERMINAL_COMMAND_EVENT,
        handleTerminalCommand
      )
    }
  })

  return (
    <>
      {isEmbedded ? null : (
        <Button
          type="button"
          variant="secondary"
          size="none"
          className="size-8"
          aria-label="Open terminal"
          title="Open terminal"
          onClick={openTerminal}
        >
          {status === 'starting' ? (
            <SpinnerIcon className="size-4" />
          ) : (
            <TerminalCustomIcon className="size-4" />
          )}
        </Button>
      )}

      <DashboardTerminalPanel
        isOpen={isOpen}
        portalRoot={portalRoot}
        variant={isEmbedded ? 'embedded' : 'fixed'}
        panelHeight={panelHeight}
        sandboxId={sandboxId}
        template={template}
        status={status}
        terminalContainerRef={terminalContainerRef}
        onResizeStart={startResize}
        onResizeMove={resizePanel}
        onResizeStop={stopResize}
        onFocusTerminal={() => xtermRef.current?.focus()}
        onCopyTerminalText={() => void copyTerminalText()}
        onStartTerminal={(options) => void startTerminal(options)}
        onClose={() => setIsOpen(false)}
      />

      <DashboardTerminalCommandDialog
        launch={pendingLaunch}
        onCancel={() => setPendingLaunch(null)}
        onConfirm={confirmPendingLaunch}
      />
    </>
  )
}
