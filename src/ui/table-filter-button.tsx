import { X } from 'lucide-react'
import React from 'react'
import { Button } from './primitives/button'

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
      variant="secondary"
      className="max-w-56"
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
      <X />
    </Button>
  )
})

TableFilterButton.displayName = 'TableFilterButton'
