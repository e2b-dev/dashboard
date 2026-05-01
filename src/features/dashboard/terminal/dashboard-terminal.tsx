'use client'

import Sandbox, { type CommandHandle, FileType } from 'e2b'
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
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
  ESC,
  MAX_PANEL_HEIGHT_RATIO,
  MIN_PANEL_HEIGHT,
  TERMINAL_SANDBOX_TIMEOUT_MS,
} from './constants'
import DashboardTerminalPanel from './dashboard-terminal-panel'
import { DASHBOARD_TERMINAL_COMMAND_EVENT } from './events'

export { openDashboardTerminal } from './events'

import { isClipboardShortcut, isPasteShortcut } from './keyboard'
import {
  appendTerminalOutput,
  buildVisibleTerminalOutput,
  sanitizeTerminalOutput,
  shouldPrefixInputDraft,
} from './output'
import { commonPrefix, resolvePath } from './paths'
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

export default function DashboardTerminal() {
  const { team } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string>()
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [inputDraft, setInputDraft] = useState('')
  const [output, setOutput] = useState(
    'Open a terminal to start a persistent E2B sandbox.\n'
  )

  const sandboxRef = useRef<Sandbox | null>(null)
  const terminalRef = useRef<CommandHandle | null>(null)
  const pidRef = useRef<number | undefined>(undefined)
  const outputRef = useRef<HTMLPreElement | null>(null)
  const inputCaptureRef = useRef<HTMLTextAreaElement | null>(null)
  const decoderRef = useRef(new TextDecoder())
  const pendingAnsiRef = useRef('')
  const inputDraftRef = useRef('')
  const optimisticInputRef = useRef('')
  const cwdRef = useRef(DEFAULT_CWD)
  const commandHistoryRef = useRef<string[]>([])
  const commandHistoryIndexRef = useRef<number | null>(null)
  const pendingCommandsRef = useRef<string[]>([])
  const inputQueueRef = useRef(Promise.resolve())
  const resizeStartRef = useRef<{
    pointerY: number
    panelHeight: number
  } | null>(null)

  const updateInputDraft = (value: string | ((current: string) => string)) => {
    setInputDraft((current) => {
      const next = typeof value === 'function' ? value(current) : value
      inputDraftRef.current = next
      return next
    })
  }

  const appendOutput = (chunk: string) => {
    let visibleChunk = appendTerminalOutput('', chunk)
    const optimisticInput = optimisticInputRef.current
    const draft = inputDraftRef.current

    if (optimisticInput && visibleChunk.startsWith(optimisticInput)) {
      visibleChunk = visibleChunk.slice(optimisticInput.length)
      optimisticInputRef.current = ''
    }

    if (draft && !draft.includes('\n') && draft.includes(visibleChunk)) {
      return
    }

    setOutput((current) => {
      const next = appendTerminalOutput(current, visibleChunk)
      return next
    })
  }

  const disconnectTerminal = async () => {
    const terminal = terminalRef.current
    terminalRef.current = null
    if (!terminal) return

    try {
      await terminal.disconnect()
    } catch {
      // Best-effort cleanup. The sandbox is intentionally left alive to pause.
    }
  }

  const sendInputToPty = (value: string, terminalPid = pidRef.current) => {
    if (!value || !sandboxRef.current || !terminalPid) return

    const sandbox = sandboxRef.current
    inputQueueRef.current = inputQueueRef.current
      .catch(() => undefined)
      .then(() =>
        sandbox.pty.sendInput(terminalPid, new TextEncoder().encode(value))
      )
  }

  const runCommand = (command: string, terminalPid?: number) => {
    const normalizedCommand = command.trim()
    if (!normalizedCommand) return

    setOutput((current) => {
      const submittedInput = `${
        shouldPrefixInputDraft(current) ? '$ ' : ''
      }${normalizedCommand}\n`
      optimisticInputRef.current = submittedInput
      return appendTerminalOutput(current, submittedInput)
    })
    sendInputToPty(`${normalizedCommand}\r`, terminalPid)
  }

  const startTerminal = async (options: StartTerminalOptions = {}) => {
    if (status === 'starting') return

    await disconnectTerminal()
    sandboxRef.current = null
    pidRef.current = undefined
    pendingAnsiRef.current = ''
    optimisticInputRef.current = ''
    cwdRef.current = DEFAULT_CWD
    commandHistoryIndexRef.current = null
    inputQueueRef.current = Promise.resolve()
    setStatus('starting')
    setSandboxId(undefined)
    updateInputDraft('')
    setOutput('Opening terminal...\n')

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
          `Reconnecting to terminal sandbox ${storedTerminalSession.sandboxId}...\n`
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
          appendOutput('Stored terminal sandbox is unavailable.\n')
          appendOutput('Starting persistent E2B sandbox...\n')
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
      appendOutput(`Sandbox ${sandbox.sandboxId} is running.\n`)

      appendOutput('Opening PTY...\n')
      const terminal = await sandbox.pty.create({
        cols: DEFAULT_COLS,
        rows: DEFAULT_ROWS,
        timeoutMs: 0,
        cwd: DEFAULT_CWD,
        onData: (data) => {
          appendOutput(
            sanitizeTerminalOutput(data, decoderRef.current, pendingAnsiRef)
          )
        },
      })

      terminalRef.current = terminal
      pidRef.current = terminal.pid
      setStatus('ready')
      writeStoredTerminalSession(userId, { sandboxId: sandbox.sandboxId })
      appendOutput(`PTY ${terminal.pid} attached.\n`)

      const pendingCommands = pendingCommandsRef.current
      pendingCommandsRef.current = []
      for (const command of pendingCommands) {
        runCommand(command, terminal.pid)
      }
    } catch (error) {
      setStatus('error')
      appendOutput(
        `\nFailed to start terminal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }\n`
      )
    }
  }

  const openTerminal = () => {
    setIsOpen(true)
    if (status === 'idle' || status === 'error') {
      startTerminal()
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
      startTerminal(options)
    }
  }

  const sendInput = (value: string) => {
    if (status !== 'ready') return
    sendInputToPty(value)
  }

  const getSelectedTerminalText = () => {
    const selection = window.getSelection()
    const terminalOutput = outputRef.current

    if (!selection || selection.isCollapsed || !terminalOutput) return ''

    const { anchorNode, focusNode } = selection
    if (
      (!anchorNode || !terminalOutput.contains(anchorNode)) &&
      (!focusNode || !terminalOutput.contains(focusNode))
    ) {
      return ''
    }

    return selection.toString()
  }

  const copyTerminalText = async (text = getSelectedTerminalText()) => {
    const value = text || visibleOutput
    if (!value) return

    await navigator.clipboard.writeText(value)
    inputCaptureRef.current?.focus()
  }

  const pasteTerminalText = (text: string) => {
    const normalizedText = text.replace(/\r\n?/g, '\n')
    updateInputDraft((current) => `${current}${normalizedText}`)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        pasteTerminalText(text)
      }
    } catch {
      // The browser may block clipboard reads; native paste still uses onPaste.
    }
  }

  const completeInputDraft = async () => {
    const sandbox = sandboxRef.current
    const draft = inputDraftRef.current
    if (!sandbox || !draft) return

    const tokenStart = Math.max(
      draft.lastIndexOf(' ') + 1,
      draft.lastIndexOf('\t') + 1
    )
    const token = draft.slice(tokenStart)
    const slashIndex = token.lastIndexOf('/')
    const rawDirectory = slashIndex === -1 ? '' : token.slice(0, slashIndex + 1)
    const filePrefix = slashIndex === -1 ? token : token.slice(slashIndex + 1)
    const directoryPath = resolvePath(rawDirectory || '.', cwdRef.current)

    try {
      const entries = await sandbox.files.list(directoryPath)
      const matches = entries
        .filter((entry) => {
          const name = entry.path.split('/').pop() ?? ''
          return name.startsWith(filePrefix)
        })
        .map((entry) => {
          const name = entry.path.split('/').pop() ?? ''
          return {
            name,
            suffix: entry.type === FileType.DIR ? '/' : ' ',
          }
        })

      if (matches.length === 0) return

      if (matches.length === 1) {
        const match = matches[0]
        if (!match) return

        updateInputDraft(
          `${draft.slice(0, tokenStart)}${rawDirectory}${match.name}${
            match.suffix
          }`
        )
        return
      }

      const prefix = commonPrefix(matches.map((match) => match.name))
      if (prefix.length > filePrefix.length) {
        updateInputDraft(
          `${draft.slice(0, tokenStart)}${rawDirectory}${prefix}`
        )
      }
    } catch {
      // Ignore completion failures; Tab should not disrupt terminal input.
    }
  }

  const handleTerminalKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (status !== 'ready') return

    if (isPasteShortcut(event)) {
      event.preventDefault()
      void pasteFromClipboard()
      return
    }

    if (isClipboardShortcut(event)) {
      const selectedText = getSelectedTerminalText()

      if (selectedText) {
        event.preventDefault()
        void copyTerminalText(selectedText)
        return
      }

      if (event.metaKey) {
        return
      }
    }

    if (event.metaKey || event.altKey) return

    const keyMap: Record<string, string> = {
      Enter: '\r',
      Backspace: '\u007f',
      Tab: '\t',
      ArrowUp: `${ESC}[A`,
      ArrowDown: `${ESC}[B`,
      ArrowRight: `${ESC}[C`,
      ArrowLeft: `${ESC}[D`,
      Home: `${ESC}[H`,
      End: `${ESC}[F`,
      Delete: `${ESC}[3~`,
    }

    const controlKey =
      event.ctrlKey && event.key.length === 1
        ? String.fromCharCode(event.key.toUpperCase().charCodeAt(0) - 64)
        : undefined
    const sequence = controlKey ?? keyMap[event.key] ?? event.key

    if (sequence.length === 1 || keyMap[event.key] || controlKey) {
      event.preventDefault()
      if (!controlKey) {
        if (event.key === 'Backspace') {
          updateInputDraft((current) => current.slice(0, -1))
        } else if (event.key === 'Tab') {
          completeInputDraft()
        } else if (event.key === 'ArrowUp') {
          const history = commandHistoryRef.current
          if (history.length > 0) {
            const nextIndex =
              commandHistoryIndexRef.current === null
                ? history.length - 1
                : Math.max(commandHistoryIndexRef.current - 1, 0)
            commandHistoryIndexRef.current = nextIndex
            updateInputDraft(history[nextIndex] ?? '')
          }
        } else if (event.key === 'ArrowDown') {
          const history = commandHistoryRef.current
          if (history.length > 0 && commandHistoryIndexRef.current !== null) {
            const nextIndex = commandHistoryIndexRef.current + 1
            if (nextIndex >= history.length) {
              commandHistoryIndexRef.current = null
              updateInputDraft('')
            } else {
              commandHistoryIndexRef.current = nextIndex
              updateInputDraft(history[nextIndex] ?? '')
            }
          }
        } else if (event.key === 'Enter') {
          const draft = inputDraftRef.current
          if (draft) {
            const command = draft.trim()
            if (command && commandHistoryRef.current.at(-1) !== command) {
              commandHistoryRef.current = [
                ...commandHistoryRef.current.slice(-49),
                command,
              ]
            }
            commandHistoryIndexRef.current = null
            setOutput((current) => {
              const submittedInput = `${
                shouldPrefixInputDraft(current) ? '$ ' : ''
              }${draft}\n`
              optimisticInputRef.current = submittedInput
              return appendTerminalOutput(current, submittedInput)
            })
            sendInput(`${draft}\r`)
            const cdMatch = draft.trim().match(/^cd(?:\s+(.+))?$/)
            if (cdMatch) {
              cwdRef.current = resolvePath(
                cdMatch[1] ?? DEFAULT_CWD,
                cwdRef.current
              )
            }
          }
          updateInputDraft('')
        } else if (event.key.length === 1) {
          updateInputDraft((current) => `${current}${event.key}`)
        } else {
          sendInput(sequence)
        }
      } else {
        sendInput(sequence)
      }
    }
  }

  const handleTerminalPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault()

    const text = event.clipboardData.getData('text')
    if (text) {
      pasteTerminalText(text)
    }
  }

  const focusTerminalInput = () => {
    if (!getSelectedTerminalText()) {
      inputCaptureRef.current?.focus()
    }
  }

  const handleTerminalWheel = (event: WheelEvent<HTMLTextAreaElement>) => {
    outputRef.current?.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
    })
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
  }

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'smooth',
    })
  })

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (isOpen && status === 'ready') {
      inputCaptureRef.current?.focus()
    }
  }, [isOpen, status])

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

  const visibleOutput = buildVisibleTerminalOutput(output, inputDraft)

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
        visibleOutput={visibleOutput}
        outputRef={outputRef}
        inputCaptureRef={inputCaptureRef}
        onResizeStart={startResize}
        onResizeMove={resizePanel}
        onResizeStop={stopResize}
        onFocusTerminalInput={focusTerminalInput}
        onTerminalKeyDown={handleTerminalKeyDown}
        onTerminalPaste={handleTerminalPaste}
        onTerminalWheel={handleTerminalWheel}
        onCopyTerminalText={() => void copyTerminalText()}
        onStartTerminal={startTerminal}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
