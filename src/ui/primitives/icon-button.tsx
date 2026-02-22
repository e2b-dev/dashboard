import { cn } from '@/lib/utils/ui'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const iconButtonVariants = cva(
  [
    'inline-flex items-center cursor-pointer justify-center shrink-0',
    'transition-colors [&_svg]:transition-colors disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    '[&_svg]:text-icon-tertiary',
  ].join(' '),
  {
    variants: {
      variant: {
        secondary: [
          'h-9 w-9 [&_svg]:size-4',
          'border',
          'hover:border-stroke-active',
          'data-[display-state=hover]:border-stroke-active',
          'active:bg-bg-1',
          'data-[display-state=active]:bg-bg-1',
          'disabled:opacity-50',
          'data-[state=open]:bg-bg-1',
        ].join(' '),
        tertiary: [
          'size-4 [&_svg]:size-4',
          'hover:[&_svg]:text-icon',
          'data-[display-state=hover]:[&_svg]:text-icon',
          'active:[&_svg]:text-icon',
          'data-[display-state=active]:[&_svg]:text-icon',
          'disabled:opacity-50',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'tertiary',
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(iconButtonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
