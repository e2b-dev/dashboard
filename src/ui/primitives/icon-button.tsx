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
          'hover:border-stroke-active', // hover
          'data-[display-state=hover]:border-stroke-active', // display hover
          'active:bg-bg-1', // active
          'data-[display-state=active]:bg-bg-1', // display active
          'disabled:opacity-50', // disabled
          'data-[state=open]:bg-bg-1', // open (e.g. popover trigger)
          'data-[selected=true]:bg-bg-1 data-[selected=true]:border-stroke-active data-[selected=true]:[&_svg]:text-fg', // selected
        ].join(' '),
        tertiary: [
          'size-4 [&_svg]:size-4',
          // auto-shrink to 12×12 when nested inside a Badge (data-slot="badge")
          'in-data-[slot=badge]:size-3 in-data-[slot=badge]:[&_svg]:size-3',
          'hover:[&_svg]:text-icon', // hover
          'data-[display-state=hover]:[&_svg]:text-icon', // display hover
          'active:[&_svg]:text-icon', // active
          'data-[display-state=active]:[&_svg]:text-icon', // display active
          'disabled:opacity-50', // disabled
        ].join(' '),
      },
      size: {
        default: '',
        xl: 'size-14 [&_svg]:size-7',
      },
    },
    defaultVariants: {
      variant: 'tertiary',
      size: 'default',
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
