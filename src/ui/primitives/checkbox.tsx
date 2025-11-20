'use client'

import { CheckIcon } from '@/ui/primitives/icons'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as React from 'react'

import { cn } from '@/lib/utils/ui'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        [
          // Base layout and sizing
          'peer size-4 shrink-0',
          // Border and outline
          'border outline-none text-fg-inverted',
          // Transitions
          'transition-colors anim-ease-appear anim-duration-fast',
          // Cursor
          'cursor-pointer disabled:cursor-default',
          // Disabled state (unchecked)
          'disabled:pointer-events-none disabled:opacity-65',
          // Checked state
          'data-[state=checked]:bg-accent-main-highlight data-[state=checked]:text-fg-inverted data-[state=checked]:border-accent-main-highlight',
          // Checked + Disabled state
          'data-[state=checked]:disabled:opacity-100 data-[state=checked]:disabled:bg-fill data-[state=checked]:disabled:border-stroke data-[state=checked]:disabled:text-icon-tertiary',
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
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
