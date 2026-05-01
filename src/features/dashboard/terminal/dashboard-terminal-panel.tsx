import type { PointerEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/ui/primitives/button'
import {
  CloseIcon,
  CopyIcon,
  RefreshIcon,
  TerminalCustomIcon,
} from '@/ui/primitives/icons'
import type { StartTerminalOptions, TerminalStatus } from './types'

interface DashboardTerminalPanelProps {
  isOpen: boolean
  portalRoot: HTMLElement | null
  panelHeight: number
  sandboxId?: string
  status: TerminalStatus
  terminalContainerRef: RefObject<HTMLDivElement | null>
  onResizeStart: (event: PointerEvent<HTMLButtonElement>) => void
  onResizeMove: (pointerY: number) => void
  onResizeStop: (event: PointerEvent<HTMLButtonElement>) => void
  onFocusTerminal: () => void
  onCopyTerminalText: () => void
  onStartTerminal: (options?: StartTerminalOptions) => void
  onClose: () => void
}

export default function DashboardTerminalPanel({
  isOpen,
  portalRoot,
  panelHeight,
  sandboxId,
  status,
  terminalContainerRef,
  onResizeStart,
  onResizeMove,
  onResizeStop,
  onFocusTerminal,
  onCopyTerminalText,
  onStartTerminal,
  onClose,
}: DashboardTerminalPanelProps) {
  if (!isOpen || !portalRoot) return null

  return createPortal(
    <section
      className="fixed right-0 bottom-0 left-0 z-[2147483647] border-t bg-bg-1 shadow-2xl"
      style={{ height: panelHeight }}
    >
      <button
        type="button"
        aria-label="Resize terminal"
        title="Resize terminal"
        className="absolute -top-2 left-0 h-4 w-full cursor-ns-resize touch-none"
        onPointerDown={onResizeStart}
        onPointerMove={(event) => onResizeMove(event.clientY)}
        onPointerUp={onResizeStop}
        onPointerCancel={onResizeStop}
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
            aria-label="Copy terminal output"
            title="Copy terminal output"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onCopyTerminalText}
          >
            <CopyIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="quaternary"
            size="none"
            className="size-7"
            aria-label="Start new terminal sandbox"
            title="Start new terminal sandbox"
            disabled={status === 'starting'}
            onClick={() => onStartTerminal({ forceNewSandbox: true })}
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
            onClick={onClose}
          >
            <CloseIcon className="size-4" />
          </Button>
        </div>
      </header>

      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className="h-[calc(100%-2.5rem)] min-h-0 cursor-text overflow-hidden bg-black p-3"
        onMouseDown={onFocusTerminal}
      />
    </section>,
    portalRoot
  )
}
