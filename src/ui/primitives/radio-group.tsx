'use client'

import { cn } from '@/lib/utils/ui'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as React from 'react'

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        [
          // Base layout and sizing
          'group peer size-4 shrink-0',
          // Border and outline
          'border outline-none',
          // Transitions
          'transition-colors anim-ease-appear anim-duration-fast',
          // Cursor
          'cursor-pointer disabled:cursor-default',
          // Disabled state (unchecked)
          'disabled:pointer-events-none disabled:opacity-65',
          // Checked state
          'data-[state=checked]:border-stroke-active',
          // Checked + Disabled state
          'data-[state=checked]:disabled:opacity-100 data-[state=checked]:disabled:border-stroke',
          // Hover state
          'hover:border-stroke-active',
          'data-[display-state=hover]:border-stroke-active', // duplicated hover, for display purposes
          // Focus state
          'focus-visible:ring-1 focus-visible:ring-accent-main-highlight focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
          'data-[display-state=focus]:ring-1 data-[display-state=focus]:ring-accent-main-highlight data-[display-state=focus]:ring-offset-1 data-[display-state=focus]:ring-offset-bg', // duplicated focus, for display purposes
          // Error state
          'aria-invalid:ring-1 aria-invalid:ring-accent-error-highlight aria-invalid:ring-offset-1 aria-invalid:ring-offset-bg',
        ].join(' '),
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center text-fg-inverted p-0.5"
        forceMount
      >
        <div
          className={cn(
            [
              'bg-accent-main-highlight group-disabled:bg-fill-highlight',
              'size-2.5 origin-center',
              'transition-all anim-ease-appear anim-duration-fast',
              'group-data-[state=unchecked]:scale-[0.5] group-data-[state=unchecked]:opacity-0',
              'group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100',
            ].join(' ')
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
