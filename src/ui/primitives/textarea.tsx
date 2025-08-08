import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'bg-bg flex w-full px-3 py-2',
        'font-mono text-xs tracking-wider',
        'min-h-16 border',

        'placeholder:text-fg-tertiary placeholder:font-mono',
        'focus:[border-bottom:1px_solid_var(--accent-main-highlight )] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',

        'aria-invalid:border-destructive/60',
        'aria-invalid:focus:ring-destructive/20',
        'dark:aria-invalid:border-destructive',
        'dark:aria-invalid:ring-destructive/40',

        'transition-[color,box-shadow]',

        className
      )}
      {...props}
    />
  )
}

export { Textarea }
