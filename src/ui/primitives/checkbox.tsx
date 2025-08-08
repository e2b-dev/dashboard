'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer data-[state=checked]:bg-accent-main-highlight hover:border-stroke-active data-[state=checked]:text-fg-inverted data-[state=checked]:border-accent-main-highlight focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-accent-error-highlight/20 aria-invalid:border-accent-error-highlight size-4 shrink-0 border transition-colors outline-none focus-visible:ring-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-fg-inverted transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
