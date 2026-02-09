import { X } from 'lucide-react'
import React from 'react'
import { Button } from './primitives/button'
import { Separator } from './primitives/separator'

interface TableFilterButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  value: string
}

export const TableFilterButton = React.forwardRef<
  HTMLButtonElement,
  TableFilterButtonProps
>(({ label, value, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      size="md"
      className="max-w-56 gap-1.5 normal-case prose-body-highlight"
      suppressHydrationWarning
      {...props}
    >
      <span className="text-fg-tertiary">{label}</span>
      {value && (
        <>
          <span className="text-fg-tertiary">·</span>
          <span className="truncate text-fg">{value}</span>
        </>
      )}
      <X className="size-4 min-w-4 text-fg-tertiary" />
    </Button>
  )
})

TableFilterButton.displayName = 'TableFilterButton'
