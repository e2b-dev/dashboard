'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'bg-bg flex h-8 w-full rounded-sm border px-3 py-2',
          'font-mono text-xs tracking-wider',

          'placeholder:text-fg-500 placeholder:font-mono',
          'focus:[border-bottom:1px_solid_var(--accent)] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',

          'file:border-0 file:bg-transparent',
          'file:font-mono file:text-sm file:uppercase',
          'file:mr-4 file:px-2 file:py-1',
          'file:border-2 file:border-dashed',
          'file:hover:bg-bg-300/80',

          'autofill:border-accent-100/80 autofill:border-b-accent autofill:border-solid autofill:shadow-[inset_0_0_0px_1000px_hsl(from_var(--accent-100)_h_s_l/0.2)]',
          'autofill:bg-accent-100/30 autofill:text-fg',

          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

const DebouncedInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>
>(({ value: initialValue, onChange, debounce = 300, ...props }, ref) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, debounce, onChange])

  return (
    <Input
      {...props}
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
})
DebouncedInput.displayName = 'DebouncedInput'

const AutosizeInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input> & { autosize?: boolean }
>((props, ref) => {
  const { value, className, autosize = true, ...rest } = props
  const displayValue = value?.toString() || ''

  return (
    <Input
      {...rest}
      ref={ref}
      value={value}
      className={cn(className, autosize && 'w-[var(--width)]')}
      style={
        autosize
          ? ({
              '--width': `${Math.max(1, displayValue.length)}ch`,
            } as React.CSSProperties)
          : undefined
      }
    />
  )
})
AutosizeInput.displayName = 'AutosizeInput'

export { AutosizeInput, DebouncedInput, Input }
