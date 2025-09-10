import { cn } from '@/lib/utils/index'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Loader } from './loader'

const buttonVariants = cva(
  [
    'inline-flex items-center cursor-pointer  justify-center whitespace-nowrap',
    'font-mono uppercase',
    'transition-colors duration-150',
    'focus-visible:outline-none ',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-bg-inverted text-fg-inverted',
          'hover:bg-bg-inverted-hover focus:bg-bg-inverted-hover',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        accent: [
          'bg-accent-main-bg text-accent-main-highlight ',
          'hover:bg-accent-main-bg/80 focus:bg-accent-main-bg/80',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'hover:bg-transparent focus:bg-transparent',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        muted: [
          'border bg-bg-hover text-fg-secondary hover:text-fg',
          'hover:bg-bg-hover/90 focus:bg-bg-hover/90',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        error: [
          'bg-accent-error-bg text-accent-error-highlight',
          'hover:bg-accent-error-bg focus:bg-accent-error-bg',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        warning: [
          'bg-accent-warning-bg text-accent-warning-highlight',
          'hover:bg-accent-warning-bg focus:bg-accent-warning-bg',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        outline: [
          'border border-stroke bg-transparent',
          'hover:bg-bg-1 focus:bg-bg-1',
          'active:translate-y-[1px] active:shadow-none',
        ].join(' '),
        link: [
          'text-accent-main-highlight underline-offset-4',
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
