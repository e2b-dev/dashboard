import { cn } from '@/lib/utils/index'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  'inline-flex items-center cursor-default justify-center prose-label-highlight focus-visible:ring-1 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3  [&>svg]:pointer-events-none ![&>svg]:pl-0.75 aria-invalid:ring-accent-error-highlight/20 aria-invalid:border-accent-error-highlight transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-fg text-fg-inverted hover:bg-fg-200',
        muted: 'bg-bg-200 text-fg-tertiary',
        success: 'bg-success/20 text-success',
        warning: 'bg-warning/20 text-warning',
        error: 'bg-error/20 text-error',
        accent: 'bg-accent/15 text-accent',
        'contrast-1': 'bg-contrast-1/20 text-contrast-1',
        'contrast-2': 'bg-contrast-2/20 text-contrast-2',
        outline: 'border border-border-200 bg-bg-200',
      },
      size: {
        default: 'h-5 px-1 gap-1',
        sm: 'h-4.5 px-1 text-xs gap-0.5',
        lg: 'h-7 px-2.5 gap-1.5',
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
