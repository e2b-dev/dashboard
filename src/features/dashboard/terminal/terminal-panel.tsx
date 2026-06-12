import Link from 'next/link'
import type { RefObject } from 'react'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  ArrowLeftIcon,
  CopyIcon,
  RefreshIcon,
  TerminalIcon,
} from '@/ui/primitives/icons'

interface TerminalPanelProps {
  backHref?: string
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
  backHref,
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  terminalContainerRef,
  onFocusTerminal,
  onCopyTerminalText,
  onRestartTerminal,
}: TerminalPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border bg-bg-1">
      <header className="h-10 w-full border-b">
        <TerminalPanelHeader
          backHref={backHref}
          sandboxId={sandboxId}
          template={template}
          restartDisabled={restartDisabled}
          restartLabel={restartLabel}
          onCopyTerminalText={onCopyTerminalText}
          onRestartTerminal={onRestartTerminal}
        />
      </header>
      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className="min-h-0 flex-1 cursor-text overflow-hidden bg-black p-3"
        onMouseDown={onFocusTerminal}
      />
    </section>
  )
}

function TerminalPanelHeader({
  backHref,
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  onCopyTerminalText,
  onRestartTerminal,
}: Pick<
  TerminalPanelProps,
  | 'backHref'
  | 'sandboxId'
  | 'template'
  | 'restartDisabled'
  | 'restartLabel'
  | 'onCopyTerminalText'
  | 'onRestartTerminal'
>) {
  return (
    <div className="flex h-full items-center justify-between px-3">
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            className="text-fg-secondary hover:text-fg flex shrink-0 items-center gap-1 transition-colors"
            href={backHref}
          >
            <ArrowLeftIcon className="size-4" />
            <span className="prose-label-highlight uppercase">Agents</span>
          </Link>
        ) : (
          <>
            <TerminalIcon className="text-icon-tertiary size-4" />
            <span className="prose-label-highlight shrink-0 uppercase">
              Terminal
            </span>
          </>
        )}
        <TerminalIcon className="text-icon-tertiary size-4" />
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
}
