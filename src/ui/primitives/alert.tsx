import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const alertVariants = cva(
  'relative w-full border-solid p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-fg',
  {
    variants: {
      variant: {
        default: 'bg-bg border-border text-fg',
        contrast1: 'border-contrast-1 [&>svg]:text-contrast-1 text-fg',
        contrast2: 'border-contrast-2 [&>svg]:text-contrast-2 text-fg',
        warning: 'text-warning border-warning [&>svg]:text-warning',
        error: 'text-error border-error [&>svg]:text-error',
      },
      border: {
        left: 'border-l-[3px]',
        right: 'border-r-[3px]',
        top: 'border-t-[3px]',
        bottom: 'border-b-[3px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      border: 'left',
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-2 leading-none font-medium tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-fg-300 text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
