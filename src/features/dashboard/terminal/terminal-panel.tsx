import type { RefObject } from 'react'
import { DashboardPanelFrame } from '@/features/dashboard/shared'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  CopyIcon,
  RefreshIcon,
  TerminalCustomIcon,
} from '@/ui/primitives/icons'
import type { StartTerminalOptions, TerminalStatus } from './types'

interface TerminalPanelProps {
  sandboxId?: string
  template: string
  status: TerminalStatus
  terminalContainerRef: RefObject<HTMLDivElement | null>
  onFocusTerminal: () => void
  onCopyTerminalText: () => void
  onStartTerminal: (options?: StartTerminalOptions) => void
}

export default function TerminalPanel({
  sandboxId,
  template,
  status,
  terminalContainerRef,
  onFocusTerminal,
  onCopyTerminalText,
  onStartTerminal,
}: TerminalPanelProps) {
  const header = (
    <div className="flex h-full items-center justify-between px-3">
      <div className="flex min-w-0 items-center gap-2">
        <TerminalCustomIcon className="text-icon-tertiary size-4" />
        <span className="prose-label-highlight shrink-0 uppercase">
          Terminal
        </span>
        <span className="text-fg-tertiary shrink-0 font-mono text-xs">
          {template}
        </span>
        {sandboxId ? (
          <span className="text-fg-tertiary truncate font-mono text-xs">
            {sandboxId}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          type="button"
          variant="tertiary"
          className="size-7"
          aria-label="Copy terminal output"
          title="Copy terminal output"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCopyTerminalText}
        >
          <CopyIcon />
        </IconButton>
        <IconButton
          type="button"
          variant="tertiary"
          className="size-7"
          aria-label="Start new terminal sandbox"
          title="Start new terminal sandbox"
          disabled={status === 'starting'}
          onClick={() => onStartTerminal({ forceNewSandbox: true })}
        >
          <RefreshIcon />
        </IconButton>
      </div>
    </div>
  )

  return (
    <DashboardPanelFrame
      classNames={{
        frame: 'bg-bg-1',
      }}
      header={header}
    >
      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className="min-h-0 flex-1 cursor-text overflow-hidden bg-black p-3"
        onMouseDown={onFocusTerminal}
      />
    </DashboardPanelFrame>
  )
}
