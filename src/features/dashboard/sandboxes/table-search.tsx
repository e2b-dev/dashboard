import { DebouncedInput } from '@/ui/primitives/input'
import { cn } from '@/lib/utils'
import React, { useEffect, useCallback } from 'react'
import { useSandboxTableStore } from '@/features/dashboard/sandboxes/stores/table-store'
import { Kbd } from '@/ui/primitives/kbd'
import { trackTableInteraction } from './table-config'

export const SearchInput = React.memo(
  React.forwardRef<
    HTMLInputElement,
    {
      className?: string
    }
  >(({ className }, ref) => {
    const { setGlobalFilter, globalFilter } = useSandboxTableStore()

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === '/') {
          e.preventDefault()
          if (ref && 'current' in ref) {
            ;(ref as React.RefObject<HTMLInputElement | null>).current?.focus()
          }
          return true
        }
      },
      [ref]
    )

    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const handleChange = useCallback(
      (value: string | number) => {
        setGlobalFilter(value as string)
      },
      [setGlobalFilter]
    )

    return (
      <div className={cn('relative w-full', className)}>
        <DebouncedInput
          value={globalFilter}
          onChange={handleChange}
          placeholder="Find a sandbox..."
          className="h-10 w-full pr-14"
          ref={ref}
          debounce={500}
        />
        <Kbd
          keys={['/']}
          className="absolute top-1/2 right-2 -translate-y-1/2"
        />
      </div>
    )
  })
)

SearchInput.displayName = 'SearchInput'
