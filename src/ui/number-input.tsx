'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'
import { Button } from './primitives/button'
import { Input } from './primitives/input'

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  inputClassName?: string
  buttonClassName?: string
}

export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  className,
  inputClassName,
  buttonClassName,
  disabled,
  ...props
}: NumberInputProps) {
  // Keep track of the input value as a string for controlled input
  const [inputValue, setInputValue] = React.useState(value.toString())

  // Update the input value when the external value changes
  React.useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Allow empty input, minus sign, and decimal point
    if (newValue === '' || newValue === '-' || newValue === '.') {
      setInputValue(newValue)
      return
    }

    // Only allow numbers, one decimal point, and one minus sign at the start
    const regex = /^-?\d*\.?\d*$/
    if (!regex.test(newValue)) {
      return
    }

    setInputValue(newValue)

    // Convert to number and validate
    const numValue = parseFloat(newValue)
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue)
    }
  }

  const handleBlur = () => {
    // On blur, reset the input to the last valid value
    setInputValue(value.toString())
  }

  const increment = () => {
    const newValue = value + step
    if (newValue <= max) {
      onChange(newValue)
    }
  }

  const decrement = () => {
    const newValue = value - step
    if (newValue >= min) {
      onChange(newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      increment()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      decrement()
    }
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex flex-col">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'bg-bg-1 h-[1.125rem] border-r-0 px-2 py-0',
            buttonClassName
          )}
          onClick={increment}
          disabled={disabled || value >= max}
        >
          <ChevronUp className="h-3 w-3" />
          <span className="sr-only">Increase</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'bg-bg-1 h-[1.125rem] border-t-0 border-r-0 px-2',
            buttonClassName
          )}
          onClick={decrement}
          disabled={disabled || value <= min}
        >
          <ChevronDown className="h-3 w-3" />
          <span className="sr-only">Decrease</span>
        </Button>
      </div>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn('bg-bg-1 h-9 w-min ', inputClassName)}
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />
    </div>
  )
}
