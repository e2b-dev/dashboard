import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Loader } from '../loader'

const buttonVariants = cva(
  [
    'inline-flex items-center cursor-pointer rounded-sm justify-center whitespace-nowrap',
    'font-mono uppercase tracking-wider text-sm',
    'transition-colors duration-150',
    'focus-visible:outline-none ',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-fg text-bg',
          'hover:bg-fg-100 focus:bg-fg-100',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        accent: [
          'bg-accent/10 text-accent',
          'hover:bg-accent/20 focus:bg-accent/20',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'hover:bg-transparent focus:bg-transparent',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        muted: [
          'border border-border-200 bg-bg-200 text-fg-300 hover:text-fg',
          'hover:bg-bg-200/90 focus:bg-bg-200/90',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        error: [
          'bg-error/10 text-error',
          'hover:bg-error/20 focus:bg-error/20',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        warning: [
          'bg-warning/10 text-warning',
          'hover:bg-warning/20 focus:bg-warning/20',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        outline: [
          'border border-border-100 bg-transparent',
          'hover:bg-bg-300/80 focus:bg-bg-300/80',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        link: [
          'text-accent underline-offset-4',
          'hover:underline hover:bg-transparent',
          'focus:ring-0 focus:underline focus:bg-transparent',
          'shadow-none',
        ].join(' '),
      },
      size: {
        default: 'h-8 px-3 gap-2',
        sm: 'h-7 px-2 gap-1',
        lg: 'h-10 px-4 gap-2',
        icon: 'h-8 w-8 gap-2',
        iconSm: 'h-7 w-7 gap-1',
        iconLg: 'h-10 w-10 text-xl gap-2',
        slate: 'h-auto px-0 py-0 gap-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            {props.children}
            <Loader />
          </div>
        ) : (
          props.children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
