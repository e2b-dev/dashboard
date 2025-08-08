import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const alertVariants = cva(
  'relative w-full border-solid p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-fg',
  {
    variants: {
      variant: {
        default: 'bg-bg border-stroke text-fg',
        info: 'border-accent-info-highlight [&>svg]:text-accent-info-highlight text-fg',
        success:
          'border-accent-positive-highlight [&>svg]:text-accent-positive-highlight text-fg',
        warning:
          'border-accent-warning-highlight [&>svg]:text-accent-warning-highlight text-fg',
        error:
          'border-accent-error-highlight [&>svg]:text-accent-error-highlight text-fg',
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
    className={cn('mb-2 leading-none prose-headline-small', className)}
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
    className={cn('text-fg  [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
