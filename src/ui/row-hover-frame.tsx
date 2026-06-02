import { cn } from '@/lib/utils/ui'

interface RowHoverFrameProps {
  className?: string
}

export function RowHoverFrame({ className }: RowHoverFrameProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 -inset-y-px',
        'border border-transparent',
        'group-hover/row:border-stroke',
        'group-hover/row:[--corner-mark-color:var(--color-fg-tertiary)]',
        'group-focus-visible/row:border-stroke',
        'group-focus-visible/row:[--corner-mark-color:var(--color-fg-tertiary)]',
        className
      )}
    >
      <span
        aria-hidden
        className="absolute -top-px -left-px h-1 w-1 border-t border-l border-[var(--corner-mark-color,transparent)]"
      />
      <span
        aria-hidden
        className="absolute -top-px -right-px h-1 w-1 border-t border-r border-[var(--corner-mark-color,transparent)]"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -left-px h-1 w-1 border-b border-l border-[var(--corner-mark-color,transparent)]"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -right-px h-1 w-1 border-b border-r border-[var(--corner-mark-color,transparent)]"
      />
    </div>
  )
}
