import { cn } from '@/lib/utils/ui'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  [
    // Base layout and sizing
    'inline-flex items-center justify-center w-fit',
    // Text and cursor
    'prose-label uppercase cursor-default whitespace-nowrap shrink-0 overflow-hidden',
    // Icon styles
    ' [&>svg]:pointer-events-none ![&>svg]:pl-0.75 [&>svg]:size-3',
    // Interactive states
    'focus-visible:ring-1',
    // Error state
    'aria-invalid:ring-accent-error-highlight/20 aria-invalid:border-accent-error-highlight',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-fill text-fg-secondary',
        positive: 'bg-accent-positive-bg text-accent-positive-highlight',
        warning: 'bg-accent-warning-bg text-accent-warning-highlight',
        info: 'bg-accent-info-bg text-accent-info-highlight',
        error: 'bg-accent-error-bg text-accent-error-highlight',
        code: 'bg-bg-1 ring-1 ring-stroke text-fg-secondary font-mono',
      },
      can: {
        none: '',
        hover: 'hover:ring-1 ring-[currentColor]',
      },
      size: {
        sm: 'h-4.5 px-1 gap-0.5',
        md: 'h-5.5 px-2 gap-1',
        lg: 'h-6.5 px-2 gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      can: 'none',
    },
  }
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant,
  size,
  can,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, can }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
