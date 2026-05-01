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
import { createPortal } from 'react-dom'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/core/shared/clients/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  CloseIcon,
  RefreshIcon,
  SpinnerIcon,
  TerminalCustomIcon,
} from '@/ui/primitives/icons'
import { useDashboard } from '../context'

const TERMINAL_SANDBOX_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_COLS = 100
const DEFAULT_ROWS = 28
const DEFAULT_PANEL_HEIGHT = 260
const MIN_PANEL_HEIGHT = 160
const MAX_PANEL_HEIGHT_RATIO = 0.72
const TERMINAL_SESSION_STORAGE_PREFIX = 'dashboard-terminal-session'
const DEFAULT_CWD = '/home/user'
const ESC = String.fromCharCode(27)
const BEL = String.fromCharCode(7)
const ANSI_ESCAPE_PATTERN = new RegExp(
  `${ESC}(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~]|\\][^${BEL}]*(?:${BEL}|${ESC}\\\\)|P[^${ESC}]*(?:${ESC}\\\\)|\\^[^${ESC}]*(?:${ESC}\\\\)|_[^${ESC}]*(?:${ESC}\\\\))`,
  'g'
)
const ANSI_8BIT_CSI_PATTERN = new RegExp(
  `${String.fromCharCode(155)}[0-?]*[ -/]*[@-~]`,
  'g'
)

type TerminalStatus = 'idle' | 'starting' | 'ready' | 'error'
type StoredTerminalSession = {
  sandboxId: string
}

function extractPendingAnsiSequence(text: string) {
  const lastEscIndex = text.lastIndexOf(ESC)

  if (lastEscIndex === -1) {
    return { pending: '', text }
  }

  const tail = text.slice(lastEscIndex)

  if (tail === ESC) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  if (
    tail.startsWith(`${ESC}]`) &&
    !tail.includes(BEL) &&
    !tail.includes(`${ESC}\\`)
  ) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  if (
    tail.startsWith(`${ESC}[`) &&
    !new RegExp(`^${ESC}\\[[0-?]*[ -/]*[@-~]$`).test(tail)
  ) {
    return { pending: tail, text: text.slice(0, lastEscIndex) }
  }

  return { pending: '', text }
}

function sanitizeTerminalOutput(
  data: Uint8Array,
  decoder: TextDecoder,
  pendingAnsiRef: { current: string }
) {
  const decoded =
    pendingAnsiRef.current + decoder.decode(data, { stream: true })
  const result = extractPendingAnsiSequence(decoded)
  pendingAnsiRef.current = result.pending

  return result.text
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(ANSI_8BIT_CSI_PATTERN, '')
}

function appendTerminalOutput(current: string, chunk: string) {
  let next = current

  for (let index = 0; index < chunk.length; index += 1) {
    const char = chunk[index]
    if (char === undefined) continue

    const code = char.charCodeAt(0)

    if (char === '\r') {
      if (chunk[index + 1] === '\n') {
        next += '\n'
        index += 1
      }
      continue
    }

    if (char === '\n' || char === '\t' || code >= 32) {
      if (code !== 127) {
        next += char
      }
      continue
    }

    if (code === 8) {
      next = next.slice(0, -1)
    }
  }

  return stripTerminalTitleFragments(next)
}

function stripTerminalTitleFragments(output: string) {
  const promptPattern = /user@[A-Za-z0-9_.-]+:/g

  return output
    .split('\n')
    .map((line) => {
      if (!line.startsWith('0;')) {
        const promptMatch = /user@[A-Za-z0-9_.-]+:/.exec(line)
        if (promptMatch?.index && promptMatch.index > 0) {
          return line.slice(promptMatch.index)
        }

        return line
      }

      const promptMatches = [...line.matchAll(promptPattern)]
      if (promptMatches.length < 2) {
        return line
      }

      const promptMatch = promptMatches.at(-1)

      if (!promptMatch || promptMatch.index === undefined) {
        return line
      }

      return line.slice(promptMatch.index)
    })
    .join('\n')
}

function shouldPrefixInputDraft(output: string) {
  return !/[#$] $/.test(output)
}

function normalizeVisibleTerminalOutput(output: string) {
  const lines = output.split('\n')
  const lastLineIndex = lines.findLastIndex((line) => line.length > 0)
  const lastLine = lines[lastLineIndex]

  if (
    lastLineIndex >= 0 &&
    lastLine &&
    /^user@[A-Za-z0-9_.-]+:/.test(lastLine) &&
    !/[#$]/.test(lastLine)
  ) {
    lines[lastLineIndex] = `${lastLine}$ `
  }

  return lines.join('\n')
}

function buildVisibleTerminalOutput(output: string, inputDraft: string) {
  const normalizedOutput = normalizeVisibleTerminalOutput(output)
  if (!inputDraft) return normalizedOutput

  const lines = normalizedOutput.split('\n')
  const lastLineIndex = lines.findLastIndex((line) => line.length > 0)

  if (lastLineIndex >= 0) {
    lines[lastLineIndex] = `${lines[lastLineIndex]}${inputDraft}`
    return lines.join('\n')
  }

  return inputDraft
}

function normalizePath(path: string) {
  const absolutePath = path.startsWith('/') ? path : `${DEFAULT_CWD}/${path}`
  const parts: string[] = []

  for (const part of absolutePath.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }

  return `/${parts.join('/')}`
}

function resolvePath(path: string, cwd: string) {
  if (!path || path === '~') return DEFAULT_CWD
  if (path.startsWith('~/'))
    return normalizePath(`${DEFAULT_CWD}/${path.slice(2)}`)
  if (path.startsWith('/')) return normalizePath(path)
  return normalizePath(`${cwd}/${path}`)
}

function commonPrefix(values: string[]) {
  if (values.length === 0) return ''

  let prefix = values[0] ?? ''
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
  }

  return prefix
}

function getTerminalSessionStorageKey(userId: string) {
  return `${TERMINAL_SESSION_STORAGE_PREFIX}:${userId}`
}

function readStoredTerminalSession(userId: string) {
  try {
    const value = window.localStorage.getItem(
      getTerminalSessionStorageKey(userId)
    )
    if (!value) return null

    const session = JSON.parse(value) as StoredTerminalSession
    if (!session.sandboxId) return null

    return session
  } catch {
    return null
  }
}

function writeStoredTerminalSession(
  userId: string,
  session: StoredTerminalSession
) {
  window.localStorage.setItem(
    getTerminalSessionStorageKey(userId),
    JSON.stringify(session)
  )
}

function clearStoredTerminalSession(userId: string) {
  window.localStorage.removeItem(getTerminalSessionStorageKey(userId))
}

export default function DashboardTerminal() {
  const { team } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string>()
  const [pid, setPid] = useState<number>()
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [inputDraft, setInputDraft] = useState('')
  const [output, setOutput] = useState(
    'Open a terminal to start a persistent E2B sandbox.\n'
  )

  const sandboxRef = useRef<Sandbox | null>(null)
  const terminalRef = useRef<CommandHandle | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)
  const inputCaptureRef = useRef<HTMLTextAreaElement | null>(null)
  const decoderRef = useRef(new TextDecoder())
  const pendingAnsiRef = useRef('')
  const inputDraftRef = useRef('')
  const optimisticInputRef = useRef('')
  const cwdRef = useRef(DEFAULT_CWD)
  const commandHistoryRef = useRef<string[]>([])
  const commandHistoryIndexRef = useRef<number | null>(null)
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

  const startTerminal = async () => {
    if (status === 'starting') return

    await disconnectTerminal()
    sandboxRef.current = null
    pendingAnsiRef.current = ''
    optimisticInputRef.current = ''
    cwdRef.current = DEFAULT_CWD
    commandHistoryIndexRef.current = null
    inputQueueRef.current = Promise.resolve()
    setStatus('starting')
    setSandboxId(undefined)
    setPid(undefined)
    updateInputDraft('')
    setOutput('Opening terminal...\n')

    try {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        throw new Error('You need to sign in before opening a terminal.')
      }

      const userId = data.session.user.id
      const storedTerminalSession = readStoredTerminalSession(userId)
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
      setPid(terminal.pid)
      setStatus('ready')
      writeStoredTerminalSession(userId, { sandboxId: sandbox.sandboxId })
      appendOutput(`PTY ${terminal.pid} attached.\n`)
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

  const sendInput = (value: string) => {
    if (!value || !sandboxRef.current || !pid || status !== 'ready') return

    const sandbox = sandboxRef.current
    inputQueueRef.current = inputQueueRef.current
      .catch(() => undefined)
      .then(() => sandbox.pty.sendInput(pid, new TextEncoder().encode(value)))
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
      updateInputDraft(
        text.includes('\n') ? '' : (current) => `${current}${text}`
      )
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

  const visibleOutput = buildVisibleTerminalOutput(output, inputDraft)

  const terminalPanel =
    isOpen && portalRoot
      ? createPortal(
          <section
            className="fixed right-0 bottom-0 left-0 z-[2147483647] border-t bg-bg-1 shadow-2xl"
            style={{ height: panelHeight }}
          >
            <button
              type="button"
              aria-label="Resize terminal"
              title="Resize terminal"
              className="absolute -top-2 left-0 h-4 w-full cursor-ns-resize touch-none"
              onPointerDown={startResize}
              onPointerMove={(event) => resizePanel(event.clientY)}
              onPointerUp={stopResize}
              onPointerCancel={stopResize}
            >
              <span className="bg-border absolute top-1/2 left-1/2 h-1 w-16 -translate-x-1/2 -translate-y-1/2" />
            </button>

            <header className="flex h-10 items-center justify-between border-b px-3">
              <div className="flex min-w-0 items-center gap-2">
                <TerminalCustomIcon className="text-icon-tertiary size-4" />
                <span className="prose-label-highlight shrink-0 uppercase">
                  Terminal
                </span>
                {sandboxId ? (
                  <span className="text-fg-tertiary truncate font-mono text-xs">
                    {sandboxId}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="quaternary"
                  size="none"
                  className="size-7"
                  aria-label="Start new terminal sandbox"
                  title="Start new terminal sandbox"
                  disabled={status === 'starting'}
                  onClick={startTerminal}
                >
                  <RefreshIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="quaternary"
                  size="none"
                  className="size-7"
                  aria-label="Close terminal"
                  title="Close terminal"
                  onClick={() => setIsOpen(false)}
                >
                  <CloseIcon className="size-4" />
                </Button>
              </div>
            </header>

            <label className="relative flex h-[calc(100%-2.5rem)] min-h-0 cursor-text flex-col bg-black">
              <pre
                ref={outputRef}
                className={cn(
                  'min-h-0 flex-1 overflow-auto border-0 bg-black p-3 font-mono text-[13px] leading-5 text-white outline-none',
                  'whitespace-pre-wrap break-words selection:bg-white/25'
                )}
              >
                {visibleOutput}
              </pre>
              <textarea
                ref={inputCaptureRef}
                aria-label="Terminal input"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value=""
                onChange={() => undefined}
                onKeyDown={handleTerminalKeyDown}
                onPaste={handleTerminalPaste}
                onWheel={handleTerminalWheel}
                className="absolute inset-0 resize-none border-0 bg-transparent p-0 text-transparent caret-transparent opacity-0 outline-none"
              />
            </label>
          </section>,
          portalRoot
        )
      : null

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

      {terminalPanel}
    </>
  )
}
