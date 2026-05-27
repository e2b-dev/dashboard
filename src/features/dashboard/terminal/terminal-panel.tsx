import type { RefObject } from 'react'
import { SandboxInspectFrame as DashboardPanelFrame } from '@/features/dashboard/shared'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  CopyIcon,
  RefreshIcon,
  TerminalCustomIcon,
} from '@/ui/primitives/icons'

interface TerminalPanelProps {
  sandboxId?: string
  template?: string
  restartDisabled: boolean
  restartLabel: string
  terminalContainerRef: RefObject<HTMLDivElement | null>
  onFocusTerminal: () => void
  onCopyTerminalText: () => void
  onRestartTerminal: () => void
}

export default function TerminalPanel({
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  terminalContainerRef,
  onFocusTerminal,
  onCopyTerminalText,
  onRestartTerminal,
}: TerminalPanelProps) {
  const header = (
    <div className="flex h-full items-center justify-between px-3">
      <div className="flex min-w-0 items-center gap-2">
        <TerminalCustomIcon className="text-icon-tertiary size-4" />
        <span className="prose-label-highlight shrink-0 uppercase">
          Terminal
        </span>
        {template ? (
          <span className="text-fg-tertiary shrink-0 font-mono text-xs">
            {template}
          </span>
        ) : null}
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
          aria-label={restartLabel}
          title={restartLabel}
          disabled={restartDisabled}
          onClick={onRestartTerminal}
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
