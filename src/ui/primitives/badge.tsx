import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex gap-1 items-center !text-label px-2  py-1 text-xs font-mono font-light transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-fill text-fg-secondary',
        positive: 'bg-accent-positive-bg text-accent-positive-highlight',
        warning: 'bg-accent-warning-bg text-accent-warning-highlight',
        info: 'bg-accent-info-bg text-accent-info-highlight',
        error: 'bg-accent-error-bg text-accent-error-highlight',
        success: 'bg-accent-positive-bg text-accent-positive-highlight',

        muted: 'bg-bg-1 text-fg-tertiary',
        accent: 'bg-accent-main-bg text-accent-main-highlight ',
        outline: 'border border-stroke text-fg-secondary',
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
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
