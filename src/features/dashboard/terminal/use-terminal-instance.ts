import { CanvasAddon } from '@xterm/addon-canvas'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { Terminal as XTerm } from '@xterm/xterm'
import { useCallback, useEffect, useRef } from 'react'
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_TERMINAL_TRANSCRIPT_CHARS,
} from './constants'
import { calculateTerminalSize } from './terminal-size'

const INITIAL_TERMINAL_TEXT =
  'Open a terminal to start a persistent E2B sandbox.\r\n'
const TERMINAL_THEME = {
  background: '#000000',
  cursor: '#ffffff',
  foreground: '#ffffff',
  selectionBackground: '#ffffff40',
}

interface UseTerminalInstanceOptions {
  onInput: (data: string) => void
  onResize: (size: { cols: number; rows: number }) => void
}

export function useTerminalInstance({
  onInput,
  onResize,
}: UseTerminalInstanceOptions) {
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement | null>(null)
  const terminalTranscriptRef = useRef(INITIAL_TERMINAL_TEXT)
  const terminalSizeRef = useRef({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
  const decoderRef = useRef(new TextDecoder())

  const resizeTerminal = useCallback(() => {
    fitAddonRef.current?.fit()
    const nextSize = calculateTerminalSize(
      terminalContainerRef.current,
      xtermRef.current
    )
    terminalSizeRef.current = nextSize
    xtermRef.current?.resize(nextSize.cols, nextSize.rows)
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
    xtermRef.current?.write(chunk, () => {
      xtermRef.current?.scrollToBottom()
    })
  }, [])

  const resetTerminal = useCallback(() => {
    decoderRef.current = new TextDecoder()
    terminalTranscriptRef.current = ''
    xtermRef.current?.reset()
  }, [])

  const focusTerminal = useCallback(() => {
    xtermRef.current?.focus()
  }, [])

  const copyTerminalText = useCallback(async () => {
    const value =
      xtermRef.current?.getSelection() || terminalTranscriptRef.current
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

    const fitAddon = new FitAddon()
    let rendererAddon: WebglAddon | CanvasAddon | undefined
    let contextLossSubscription: { dispose: () => void } | undefined

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon
    terminal.loadAddon(fitAddon)
    terminal.open(container)

    try {
      const webglAddon = new WebglAddon()
      const webglContextLossSubscription = webglAddon.onContextLoss(() => {
        webglContextLossSubscription.dispose()
        webglAddon.dispose()
        if (rendererAddon === webglAddon) {
          rendererAddon = undefined
        }
        if (contextLossSubscription === webglContextLossSubscription) {
          contextLossSubscription = undefined
        }
      })
      contextLossSubscription = webglContextLossSubscription
      rendererAddon = webglAddon
      terminal.loadAddon(webglAddon)
    } catch {
      contextLossSubscription?.dispose()
      contextLossSubscription = undefined
      rendererAddon?.dispose()
      try {
        rendererAddon = new CanvasAddon()
        terminal.loadAddon(rendererAddon)
      } catch {
        rendererAddon?.dispose()
        rendererAddon = undefined
      }
    }

    const dataSubscription = terminal.onData(onInput)
    terminal.write(terminalTranscriptRef.current, () => {
      terminal.scrollToBottom()
    })

    requestAnimationFrame(() => {
      resizeTerminal()
      terminal.focus()
      terminal.scrollToBottom()
    })
    const resizeTimer = window.setTimeout(() => {
      resizeTerminal()
      terminal.scrollToBottom()
    }, 100)

    return () => {
      window.clearTimeout(resizeTimer)
      dataSubscription.dispose()
      contextLossSubscription?.dispose()
      rendererAddon?.dispose()
      fitAddon.dispose()
      terminal.dispose()
      if (xtermRef.current === terminal) {
        xtermRef.current = null
      }
      if (fitAddonRef.current === fitAddon) {
        fitAddonRef.current = null
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
    resetTerminal,
    resizeTerminal,
    terminalContainerRef,
  }
}
