import { cn } from '@/lib/utils/index'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  'inline-flex items-center cursor-default justify-center prose-label-highlight focus-visible:ring-1 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none ![&>svg]:pl-0.75 aria-invalid:ring-accent-error-highlight/20 aria-invalid:border-accent-error-highlight transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-bg-highlight text-fg-secondary',
        positive: 'bg-accent-positive-bg text-accent-positive-highlight',
        warning: 'bg-accent-warning-bg text-accent-warning-highlight',
        info: 'bg-accent-info-bg text-accent-info-highlight',
        error: 'bg-accent-error-bg text-accent-error-highlight',
        code: 'bg-bg-1 ring-1 ring-stroke text-fg-secondary font-mono',
      },
      size: {
        default: 'h-5 px-1 gap-1',
        sm: 'h-4.5 px-1 text-xs gap-0.5',
        lg: 'h-7 px-2 gap-1.5',
      },
      can: {
        none: '',
        hover: 'hover:ring-1 ring-[currentColor]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
