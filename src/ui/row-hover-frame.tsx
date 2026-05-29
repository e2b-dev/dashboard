import { cn } from '@/lib/utils/ui'

interface RowHoverFrameProps {
  className?: string
}

/**
 * Decorative hover frame for table rows. Place as a child of a row that
 * carries `group/row` and `relative`.
 *
 * Defaults:
 *  - 12px horizontal bleed, 1px vertical bleed
 *  - visible on `group-hover/row` and `group-focus-visible/row`
 *  - corner marks driven by `--corner-mark-color` (transparent until lit)
 *
 * Extend by passing className with Tailwind utilities. To override the
 * corner colour with a non-default trigger, prefix with `!` so it wins
 * against the variant-prefixed defaults (twMerge can't always reconcile
 * arbitrary CSS-variable assignments).
 */
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
