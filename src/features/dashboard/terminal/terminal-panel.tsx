import { motion } from 'motion/react'
import type React from 'react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'
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

type TerminalPanelFrameProps = React.ComponentProps<typeof motion.div> & {
  header: React.ReactNode
  classNames?: {
    frame?: string
    header?: string
  }
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
  return (
    <TerminalPanelFrame
      classNames={{
        frame: 'bg-bg-1',
      }}
      header={
        <TerminalPanelHeader
          sandboxId={sandboxId}
          template={template}
          restartDisabled={restartDisabled}
          restartLabel={restartLabel}
          onCopyTerminalText={onCopyTerminalText}
          onRestartTerminal={onRestartTerminal}
        />
      }
    >
      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className="min-h-0 flex-1 cursor-text overflow-hidden bg-black p-3"
        onMouseDown={onFocusTerminal}
      />
    </TerminalPanelFrame>
  )
}

function TerminalPanelFrame({
  className,
  classNames,
  children,
  header,
  ...props
}: TerminalPanelFrameProps) {
  return (
    <motion.div
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'bg-bg flex h-full min-h-0 flex-1 flex-col overflow-hidden border',
        classNames?.frame,
        className
      )}
      {...props}
    >
      <div className={cn('h-10 w-full border-b', classNames?.header)}>
        {header}
      </div>
      {children as React.ReactNode}
    </motion.div>
  )
}

function TerminalPanelHeader({
  sandboxId,
  template,
  restartDisabled,
  restartLabel,
  onCopyTerminalText,
  onRestartTerminal,
}: Pick<
  TerminalPanelProps,
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
}
