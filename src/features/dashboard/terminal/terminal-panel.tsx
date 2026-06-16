import Link from 'next/link'
import type { PointerEvent, RefObject } from 'react'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  ArrowLeftIcon,
  CloseIcon,
  CopyIcon,
  RefreshIcon,
  TerminalIcon,
} from '@/ui/primitives/icons'

interface TerminalPanelProps {
  backHref?: string
  sandboxId?: string
  template?: string
  collapsed?: boolean
  restartDisabled: boolean
  restartLabel: string
  terminalContainerRef: RefObject<HTMLDivElement | null>
  onFocusTerminal: () => void
  onCopyTerminalText: () => void
  onClose?: () => void
  onHeaderPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onMinimize?: () => void
  onRestartTerminal: () => void
}

export default function TerminalPanel({
  backHref,
  collapsed = false,
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  terminalContainerRef,
  onFocusTerminal,
  onCopyTerminalText,
  onClose,
  onHeaderPointerDown,
  onMinimize,
  onRestartTerminal,
}: TerminalPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border bg-bg-1">
      <header className="h-10 w-full border-b">
        <TerminalPanelHeader
          backHref={backHref}
          collapsed={collapsed}
          sandboxId={sandboxId}
          template={template}
          restartDisabled={restartDisabled}
          restartLabel={restartLabel}
          onClose={onClose}
          onCopyTerminalText={onCopyTerminalText}
          onHeaderPointerDown={onHeaderPointerDown}
          onMinimize={onMinimize}
          onRestartTerminal={onRestartTerminal}
        />
      </header>
      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className={
          collapsed
            ? 'hidden'
            : 'min-h-0 flex-1 cursor-text overflow-hidden bg-black p-3'
        }
        onMouseDown={onFocusTerminal}
      />
    </section>
  )
}

function TerminalPanelHeader({
  backHref,
  collapsed,
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  onCopyTerminalText,
  onClose,
  onHeaderPointerDown,
  onMinimize,
  onRestartTerminal,
}: Pick<
  TerminalPanelProps,
  | 'backHref'
  | 'collapsed'
  | 'sandboxId'
  | 'template'
  | 'restartDisabled'
  | 'restartLabel'
  | 'onClose'
  | 'onCopyTerminalText'
  | 'onHeaderPointerDown'
  | 'onMinimize'
  | 'onRestartTerminal'
>) {
  return (
    <div
      className="flex h-full items-center justify-between px-3"
      onPointerDown={onHeaderPointerDown}
    >
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            className="text-fg-secondary hover:text-fg flex shrink-0 items-center transition-colors"
            href={backHref}
            aria-label="Back to agents"
            title="Back to agents"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
        ) : (
          <>
            <TerminalIcon className="text-icon-tertiary size-4" />
            <span className="prose-label-highlight shrink-0 uppercase">
              Terminal
            </span>
          </>
        )}
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
        {collapsed ? null : (
          <>
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
          </>
        )}
        {onMinimize ? (
          <IconButton
            type="button"
            variant="tertiary"
            className="size-7"
            aria-label={collapsed ? 'Restore terminal' : 'Minimize terminal'}
            title={collapsed ? 'Restore terminal' : 'Minimize terminal'}
            onClick={onMinimize}
          >
            {collapsed ? (
              <span
                aria-hidden
                className="block size-3 border border-current"
              />
            ) : (
              <span aria-hidden className="block h-px w-3 bg-current" />
            )}
          </IconButton>
        ) : null}
        {onClose ? (
          <IconButton
            type="button"
            variant="tertiary"
            className="size-7"
            aria-label="Close terminal"
            title="Close terminal"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}
