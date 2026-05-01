'use client'

import { Terminal as XTerm } from '@xterm/xterm'
import Sandbox, { type CommandHandle } from 'e2b'
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/core/shared/clients/supabase/client'
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
  TERMINAL_SANDBOX_TIMEOUT_MS,
} from './constants'
import DashboardTerminalPanel from './dashboard-terminal-panel'
import { DASHBOARD_TERMINAL_COMMAND_EVENT } from './events'
import {
  clearStoredTerminalSession,
  readStoredTerminalSession,
  writeStoredTerminalSession,
} from './storage'
import type {
  DashboardTerminalCommandDetail,
  StartTerminalOptions,
  TerminalStatus,
} from './types'

export { openDashboardTerminal } from './events'

const INITIAL_TERMINAL_TEXT =
  'Open a terminal to start a persistent E2B sandbox.\r\n'
const MIN_TERMINAL_COLS = 40
const MIN_TERMINAL_ROWS = 8
const TERMINAL_PADDING_PX = 24
const TERMINAL_SCROLLBAR_GUTTER_PX = 28
const DEFAULT_CELL_WIDTH_PX = 8
const DEFAULT_CELL_HEIGHT_PX = 20
const MIN_CELL_WIDTH_PX = 4
const MAX_CELL_WIDTH_PX = 16
const MIN_CELL_HEIGHT_PX = 8
const MAX_CELL_HEIGHT_PX = 40
const TERMINAL_THEME = {
  background: '#000000',
  cursor: '#ffffff',
  foreground: '#ffffff',
  selectionBackground: '#ffffff40',
}

function getElementSize(element: Element | null) {
  if (!element) return undefined

  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return undefined

  return rect
}

function getMeasuredCellSize(terminal: XTerm | null) {
  const measureElement = terminal?.element?.querySelector(
    '.xterm-char-measure-element'
  )
  const rowElement = terminal?.element?.querySelector('.xterm-rows > div')
  const measuredCharSize = getElementSize(measureElement ?? null)
  const rowSize = getElementSize(rowElement ?? null)

  if (!measuredCharSize && !rowSize) return undefined

  const measuredWidth = measuredCharSize?.width
  const measuredHeight = rowSize?.height ?? measuredCharSize?.height

  return {
    width:
      measuredWidth &&
      measuredWidth >= MIN_CELL_WIDTH_PX &&
      measuredWidth <= MAX_CELL_WIDTH_PX
        ? measuredWidth
        : undefined,
    height:
      measuredHeight &&
      measuredHeight >= MIN_CELL_HEIGHT_PX &&
      measuredHeight <= MAX_CELL_HEIGHT_PX
        ? measuredHeight
        : undefined,
  }
}

function calculateTerminalSize(
  container: HTMLDivElement | null,
  terminal: XTerm | null
) {
  if (!container) {
    return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS }
  }

  const measuredCellSize = getMeasuredCellSize(terminal)
  const containerRect = container.getBoundingClientRect()
  const containerWidth =
    container.clientWidth || containerRect.width || window.innerWidth
  const containerHeight =
    container.clientHeight || containerRect.height || DEFAULT_PANEL_HEIGHT
  const availableWidth =
    containerWidth - TERMINAL_PADDING_PX - TERMINAL_SCROLLBAR_GUTTER_PX
  const availableHeight = containerHeight - TERMINAL_PADDING_PX
  const cellWidth = Math.max(
    measuredCellSize?.width ?? DEFAULT_CELL_WIDTH_PX,
    1
  )
  const cellHeight = Math.max(
    measuredCellSize?.height ?? DEFAULT_CELL_HEIGHT_PX,
    1
  )

  return {
    cols: Math.max(MIN_TERMINAL_COLS, Math.floor(availableWidth / cellWidth)),
    rows: Math.max(
      MIN_TERMINAL_ROWS,
      Math.floor(availableHeight / cellHeight) - 1
    ),
  }
}

export default function DashboardTerminal() {
  const { team } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string>()
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

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

    await disconnectTerminal()
    sandboxRef.current = null
    pidRef.current = undefined
    decoderRef.current = new TextDecoder()
    inputQueueRef.current = Promise.resolve()
    terminalTranscriptRef.current = ''
    xtermRef.current?.reset()
    setStatus('starting')
    setSandboxId(undefined)
    appendOutput('Opening terminal...\r\n')

    try {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        throw new Error('You need to sign in before opening a terminal.')
      }

      const userId = data.session.user.id
      const storedTerminalSession = options.forceNewSandbox
        ? null
        : readStoredTerminalSession(userId)
      let sandbox: Sandbox

      if (storedTerminalSession) {
        appendOutput(
          `Reconnecting to terminal sandbox ${storedTerminalSession.sandboxId}...\r\n`
        )

        try {
          sandbox = await Sandbox.connect(storedTerminalSession.sandboxId, {
            domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
            timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
            headers: {
              ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
            },
          })
        } catch {
          clearStoredTerminalSession(userId)
          appendOutput('Stored terminal sandbox is unavailable.\r\n')
          appendOutput('Starting persistent E2B sandbox...\r\n')
          sandbox = await Sandbox.create('base', {
            domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
            timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
            lifecycle: {
              onTimeout: 'pause',
              autoResume: true,
            },
            metadata: {
              source: 'dashboard-terminal',
              userId,
            },
            headers: {
              ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
            },
          })
        }
      } else {
        appendOutput('Starting persistent E2B sandbox...\r\n')
        sandbox = await Sandbox.create('base', {
          domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
          timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
          lifecycle: {
            onTimeout: 'pause',
            autoResume: true,
          },
          metadata: {
            source: 'dashboard-terminal',
            userId,
          },
          headers: {
            ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
          },
        })
      }

      writeStoredTerminalSession(userId, { sandboxId: sandbox.sandboxId })

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
      writeStoredTerminalSession(userId, { sandboxId: sandbox.sandboxId })
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
    setIsOpen(true)
    if (command.trim()) {
      pendingCommandsRef.current = [...pendingCommandsRef.current, command]
    }

    if (status === 'ready' && !options.forceNewSandbox) {
      const pendingCommands = pendingCommandsRef.current
      pendingCommandsRef.current = []
      for (const pendingCommand of pendingCommands) {
        runCommand(pendingCommand)
      }
      return
    }

    if (status === 'idle' || status === 'error' || options.forceNewSandbox) {
      void startTerminal(options)
    }
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

      <DashboardTerminalPanel
        isOpen={isOpen}
        portalRoot={portalRoot}
        panelHeight={panelHeight}
        sandboxId={sandboxId}
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
    </>
  )
}
