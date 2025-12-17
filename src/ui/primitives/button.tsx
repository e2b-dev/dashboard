import { cn } from '@/lib/utils/ui'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const buttonVariants = cva(
  [
    'inline-flex items-center cursor-pointer justify-center whitespace-nowrap prose-body-highlight!',
    'transition-colors [&_svg]:transition-colors disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    '[&_svg]:text-icon-tertiary',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          '[&_svg]:text-icon-inverted',
          'bg-bg-inverted text-fg-inverted',
          'hover:bg-bg-inverted-hover', // hover
          'data-[display-state=hover]:bg-bg-inverted-hover', // duplicated hover, for display purposes
          'disabled:text-fg-tertiary disabled:bg-fill disabled:[&_svg]:text-icon-tertiary', // disabled
          'data-[state=open]:bg-bg-inverted-hover',
        ].join(' '),
        secondary: [
          'border',
          'hover:border-stroke-active', // hover
          'data-[display-state=hover]:border-stroke-active', // duplicated hover, for display purposes
          'active:bg-bg-1 active:[&_svg]:text-icon', // active
          'data-[display-state=active]:bg-bg-1 data-[display-state=active]:[&_svg]:text-icon', // duplicated active, for display purposes
          'disabled:opacity-65', // disabled
          'data-[state=open]:bg-bg-1',
        ].join(' '),
        tertiary: [
          'text-fg',
          'hover:text-fg hover:underline', // hover
          'data-[display-state=hover]:text-fg data-[display-state=hover]:underline', // duplicated hover, for display purposes
          'active:text-fg active:[&_svg]:text-icon', // active
          'data-[display-state=active]:text-fg data-[display-state=active]:[&_svg]:text-icon', // duplicated active, for display purposes
          'disabled:opacity-65 text-fg-tertiary', // disabled
        ].join(' '),
        quaternary: [
          'text-fg-tertiary',
          'hover:text-fg', // hover
          'data-[display-state=hover]:text-fg', // duplicated hover, for display purposes
          'active:text-fg active:[&_svg]:text-icon', // active
          'data-[display-state=active]:text-fg data-[display-state=active]:[&_svg]:text-icon', // duplicated active, for display purposes
          'disabled:opacity-65', // disabled
        ].join(' '),
        error: [
          '[&_svg]:text-icon-inverted',
          'bg-accent-error-highlight text-fg-inverted',
          'hover:bg-accent-error-highlight/90', // hover
          'data-[display-state=hover]:bg-accent-error-highlight/90', // duplicated hover, for display purposes
          'disabled:text-fg-tertiary disabled:bg-fill disabled:[&_svg]:text-icon-tertiary', // disabled
          'data-[state=open]:bg-accent-error-highlight/90',
        ].join(' '),
      },
      size: {
        default:
          '[&_svg]:size-4 h-9 py-1.5 gap-1 [&:has(svg)]:pr-3 [&:has(svg)]:pl-2.5 px-4',
        icon: 'h-9 w-9 px-2.5 py-1.5 [&_svg]:size-5',
        'icon-sm': 'h-7 w-7 px-2.5 py-1.5 [&_svg]:size-4',
        'icon-xs': 'size-4.5 [&_svg]:size-3',
        'icon-lg': 'h-12 w-12 px-2.5 py-1.5 [&_svg]:size-6',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
