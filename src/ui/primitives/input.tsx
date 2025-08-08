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
          'bg-bg flex h-8 w-full border px-3 py-2',
          'prose-body placeholder:text-fg-tertiary',

          'focus:[border-bottom:1px_solid_var(--accent-main-highlight)] focus:outline-none',
          'hover:bg-bg-hover focus:bg-bg-hover',
          'disabled:cursor-not-allowed disabled:opacity-50',

          'file:border-0 file:bg-transparent',
          'file:font-mono file: file:uppercase',
          'file:mr-4 file:px-2 file:py-1',
          'file:border-2 file:border-dashed',
          'file:hover:bg-bg-1',

          'autofill:border-accent-main-highlight autofill:border-b-accent-main-highlight autofill:border-solid autofill:shadow-[inset_0_0_0px_1000px_var(--accent-main-bg)]',
          'autofill:bg-accent-main-bg autofill:text-fg',

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
