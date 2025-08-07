import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  'inline-flex items-center cursor-default h-4.5 justify-center px-1.25 text-xs prose-label focus-visible:ring-1 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-0.5 [&>svg]:pointer-events-none ![&>svg]:pl-0.75 aria-invalid:ring-accent-error-highlight/20 aria-invalid:border-accent-error-highlight transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-bg-highlight text-fg-secondary',
        positive: 'bg-accent-positive-bg text-accent-positive-highlight',
        warning: 'bg-accent-warning-bg text-accent-warning-highlight',
        info: 'bg-accent-info-bg text-accent-info-highlight',
        error: 'bg-accent-error-bg text-accent-error-highlight',
        code: 'bg-fill ring-1 ring-stroke text-fg-secondary',
      },
      can: {
        none: '',
        hover: 'hover:ring-1 ring-[currentColor]',
      },
      size: {
        default: 'px-2 py-1 text-xs',
        sm: 'px-1 py-0.5 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      can: 'none',
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

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
