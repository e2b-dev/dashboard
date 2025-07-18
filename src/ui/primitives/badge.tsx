import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex gap-1 items-center px-2 rounded-sm py-1 text-xs font-mono font-light transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-fg text-bg hover:bg-fg-200',
        muted: 'bg-bg-200 text-fg-500',
        success: 'bg-success/20 text-success',
        warning: 'bg-warning/20 text-warning',
        error: 'bg-error/20 text-error',
        accent: 'bg-accent/15 text-accent',
        'contrast-1': 'bg-contrast-1/20 text-contrast-1',
        'contrast-2': 'bg-contrast-2/20 text-contrast-2',
        outline: 'border border-border-200 bg-bg-200',
      },
      size: {
        default: 'px-2 py-1 text-xs',
        sm: 'px-1 py-0.5 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
      defaultVariants: {
        variant: 'default',
      },
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
