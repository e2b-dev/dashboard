import { Terminal as GhosttyTerminal, init as initGhostty } from 'ghostty-web'
import type { ClipboardEvent } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_TERMINAL_TRANSCRIPT_CHARS,
} from './constants'
import { sanitizeTerminalPaste } from './terminal-paste'
import { calculateTerminalSize } from './terminal-size'

const INITIAL_TERMINAL_TEXT =
  'Open a terminal to start a persistent E2B sandbox.\r\n'
const TERMINAL_THEME = {
  background: '#000000',
  cursor: '#ffffff',
  foreground: '#ffffff',
  selectionBackground: '#ffffff40',
}
const TERMINAL_INIT_ERROR_TEXT =
  '\r\nTerminal failed to load. Reload the page to try again.\r\n'

const ghosttyReady = initGhostty()

interface UseTerminalInstanceOptions {
  onInput: (data: string) => void
  onResize: (size: { cols: number; rows: number }) => void
}

export function useTerminalInstance({
  onInput,
  onResize,
}: UseTerminalInstanceOptions) {
  const terminalRef = useRef<GhosttyTerminal | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement | null>(null)
  const terminalTranscriptRef = useRef(INITIAL_TERMINAL_TEXT)
  const terminalSizeRef = useRef({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
  const decoderRef = useRef(new TextDecoder())

  const resizeTerminal = useCallback(() => {
    const nextSize = calculateTerminalSize(
      terminalContainerRef.current,
      terminalRef.current
    )
    terminalSizeRef.current = nextSize
    terminalRef.current?.resize(nextSize.cols, nextSize.rows)
    onResize(nextSize)

    return nextSize
  }, [onResize])

  const appendOutput = useCallback((chunk: string | Uint8Array) => {
    const text =
      typeof chunk === 'string'
        ? chunk
        : decoderRef.current.decode(chunk, { stream: true })

    terminalTranscriptRef.current = (
      terminalTranscriptRef.current + text
    ).slice(-MAX_TERMINAL_TRANSCRIPT_CHARS)
    terminalRef.current?.write(chunk, () => {
      terminalRef.current?.scrollToBottom()
    })
  }, [])

  const resetTerminal = useCallback(() => {
    decoderRef.current = new TextDecoder()
    terminalTranscriptRef.current = ''
    terminalRef.current?.reset()
  }, [])

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus()
  }, [])

  const pasteTerminalText = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const text = event.clipboardData.getData('text/plain')
      if (!text) return

      event.preventDefault()

      const sanitizedText = sanitizeTerminalPaste(text)
      if (sanitizedText) {
        onInput(sanitizedText)
      }

      terminalRef.current?.focus()
    },
    [onInput]
  )

  const copyTerminalText = useCallback(async () => {
    const value =
      terminalRef.current?.getSelection() || terminalTranscriptRef.current
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
    } catch {
      appendOutput('\r\nCould not copy terminal output to clipboard.\r\n')
    } finally {
      focusTerminal()
    }
  }, [appendOutput, focusTerminal])

  useEffect(() => {
    const container = terminalContainerRef.current
    if (!container) return

    let disposed = false
    let terminal: GhosttyTerminal | null = null
    let dataSubscription: { dispose: () => void } | undefined
    let resizeTimer: number | undefined

    void ghosttyReady
      .then(() => {
        const currentContainer = terminalContainerRef.current
        if (disposed || !currentContainer) return

        terminal = new GhosttyTerminal({
          cols: terminalSizeRef.current.cols,
          rows: terminalSizeRef.current.rows,
          cursorBlink: true,
          cursorStyle: 'block',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 13,
          scrollback: 10_000,
          theme: TERMINAL_THEME,
        })

        terminalRef.current = terminal
        terminal.open(currentContainer)
        dataSubscription = terminal.onData(onInput)
        terminal.write(terminalTranscriptRef.current, () => {
          terminal?.scrollToBottom()
        })

        requestAnimationFrame(() => {
          resizeTerminal()
          terminal?.focus()
          terminal?.scrollToBottom()
        })
        resizeTimer = window.setTimeout(() => {
          resizeTerminal()
          terminal?.scrollToBottom()
        }, 100)
      })
      .catch(() => {
        const currentContainer = terminalContainerRef.current
        if (disposed || !currentContainer) return

        terminalTranscriptRef.current = (
          terminalTranscriptRef.current + TERMINAL_INIT_ERROR_TEXT
        ).slice(-MAX_TERMINAL_TRANSCRIPT_CHARS)
        currentContainer.style.color = TERMINAL_THEME.foreground
        currentContainer.textContent = TERMINAL_INIT_ERROR_TEXT.trim()
      })

    return () => {
      disposed = true
      if (resizeTimer) {
        window.clearTimeout(resizeTimer)
      }
      dataSubscription?.dispose()
      terminal?.dispose()
      if (terminalRef.current === terminal) {
        terminalRef.current = null
      }
    }
  }, [onInput, resizeTerminal])

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

  return {
    appendOutput,
    copyTerminalText,
    focusTerminal,
    pasteTerminalText,
    resetTerminal,
    resizeTerminal,
    terminalContainerRef,
  }
}
