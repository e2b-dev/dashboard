'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

import { cn } from '@/lib/utils/ui'
import { cardVariants } from './card'

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 10,
  collisionPadding = 10,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          cardVariants({ variant: 'layer' }),
          [
            // 'bg-bg-1 border',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'anim-ease-appear anim-duration-fast',
            'data-[state=open]:anim-duration-normal', // slower animation for open
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'z-50 w-72 origin-(--radix-popover-content-transform-origin)',
            'py-2 px-3',
            'shadow-md outline-hidden',
          ].join(' '),
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
