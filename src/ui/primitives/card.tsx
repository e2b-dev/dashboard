import { cn } from '@/lib/utils'
import { cva, VariantProps } from 'class-variance-authority'
import * as React from 'react'

export const cardVariants = cva('', {
  variants: {
    variant: {
      default: 'bg-bg text-fg',
      layer: 'bg-bg-200/60 backdrop-blur-lg border border-border',
      slate: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hideUnderline?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hideUnderline = false, variant = 'slate', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant: variant }),
        'rounded-sm',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 pb-3', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'tracking-wider',
      'text-md font-sans font-bold uppercase',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-fg-300 text-sm', 'tracking-wide', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-3', 'text-sm tracking-wide', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-6',
      'mt-6 border-t border-dashed',
      className
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
