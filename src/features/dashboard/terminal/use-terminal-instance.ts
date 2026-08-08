import { useCallback, useEffect, useRef } from 'react'
import type { RioTermHandle } from 'rioterm'
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_TERMINAL_TRANSCRIPT_CHARS,
} from './constants'

const INITIAL_TERMINAL_TEXT =
  'Open a terminal to start a persistent E2B sandbox.\r\n'
const TERMINAL_COLORS = {
  background: '#000000',
  cursor: '#ffffff',
  foreground: '#ffffff',
  selectionBackground: '#ffffff40',
}

const MIN_TERMINAL_COLS = 40
const MIN_TERMINAL_ROWS = 8
const TERMINAL_PADDING_PX = 24

interface UseTerminalInstanceOptions {
  onInput: (data: string) => void
  onResize: (size: { cols: number; rows: number }) => void
}

export function useTerminalInstance({
  onInput,
  onResize,
}: UseTerminalInstanceOptions) {
  const handleRef = useRef<RioTermHandle | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement | null>(null)
  const terminalTranscriptRef = useRef(INITIAL_TERMINAL_TEXT)
  const terminalSizeRef = useRef({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
  const decoderRef = useRef(new TextDecoder())

  const resizeTerminal = useCallback(
    (options?: { force?: boolean }) => {
      const container = terminalContainerRef.current
      const handle = handleRef.current
      if (!container || !handle) return terminalSizeRef.current

      const rect = container.getBoundingClientRect()
      if (rect.width && rect.height) {
        const { cellWidth, cellHeight } = handle.renderer
        // The renderer knows its cell metrics, so sizing is a floor
        // division; the floors below keep degenerate panels from
        // collapsing the PTY under 40x8.
        handle.renderer.fit(
          Math.max(
            rect.width - TERMINAL_PADDING_PX,
            MIN_TERMINAL_COLS * cellWidth
          ),
          Math.max(
            rect.height - TERMINAL_PADDING_PX,
            MIN_TERMINAL_ROWS * cellHeight
          )
        )
      }

      const nextSize = {
        cols: handle.terminal.options.cols,
        rows: handle.terminal.options.rows,
      }
      const currentSize = terminalSizeRef.current
      const sizeChanged =
        nextSize.cols !== currentSize.cols || nextSize.rows !== currentSize.rows

      terminalSizeRef.current = nextSize

      if (sizeChanged || options?.force) {
        onResize(nextSize)
      }

      return nextSize
    },
    [onResize]
  )

  const scrollTerminalToBottom = useCallback((handle = handleRef.current) => {
    try {
      handle?.terminal.scrollLines(-handle.terminal.historySize())
    } catch {}
  }, [])

  const appendOutput = useCallback(
    (chunk: string | Uint8Array) => {
      const text =
        typeof chunk === 'string'
          ? chunk
          : decoderRef.current.decode(chunk, { stream: true })

      terminalTranscriptRef.current = (
        terminalTranscriptRef.current + text
      ).slice(-MAX_TERMINAL_TRANSCRIPT_CHARS)

      const handle = handleRef.current
      if (handle) {
        // rioterm writes parse synchronously; the buffer is current when
        // write() returns, so follow-output is just a scroll after it.
        handle.terminal.write(chunk)
        scrollTerminalToBottom(handle)
      }
    },
    [scrollTerminalToBottom]
  )

  const resetTerminal = useCallback(() => {
    decoderRef.current = new TextDecoder()
    terminalTranscriptRef.current = ''
    // RIS: full reset of grid, modes, and parser state.
    handleRef.current?.terminal.write('\x1bc')
  }, [])

  const focusTerminal = useCallback(() => {
    handleRef.current?.focus()
  }, [])

  const copyTerminalText = useCallback(async () => {
    const value =
      handleRef.current?.terminal.getSelection() ||
      terminalTranscriptRef.current
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

    void (async () => {
      // Dynamic import keeps the wasm engine out of the initial bundle.
      const { open, defaultTheme } = await import('rioterm')
      if (disposed || !terminalContainerRef.current) return

      const handle = await open(terminalContainerRef.current, {
        renderer: 'canvas',
        cols: terminalSizeRef.current.cols,
        rows: terminalSizeRef.current.rows,
        // Sizing is managed here (padding + minimum dims), not by
        // rioterm's own container observer.
        fit: false,
        autoFocus: false,
        cursorStyle: 'block',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.54,
        scrollback: 10_000,
        theme: { ...defaultTheme, ...TERMINAL_COLORS },
      })

      if (disposed) {
        handle.dispose()
        return
      }
      handleRef.current = handle

      // Input sequences are complete per event, so a stateless decode is
      // correct here; decoderRef streams and belongs to output only.
      const inputDecoder = new TextDecoder()
      handle.terminal.onData((bytes) => {
        onInput(inputDecoder.decode(bytes))
      })

      handle.terminal.write(terminalTranscriptRef.current)
      scrollTerminalToBottom(handle)

      requestAnimationFrame(() => {
        if (disposed) return

        resizeTerminal()
        handle.focus()
        scrollTerminalToBottom(handle)
      })
    })()

    return () => {
      disposed = true
      handleRef.current?.dispose()
      handleRef.current = null
    }
  }, [onInput, resizeTerminal, scrollTerminalToBottom])

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
    resetTerminal,
    resizeTerminal,
    terminalContainerRef,
  }
}
