import { useSandboxTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import useKeydown from '@/lib/hooks/use-keydown'
import { cn } from '@/lib/utils'
import { DebouncedInput } from '@/ui/primitives/input'
import { Kbd } from '@/ui/primitives/kbd'
import React, { useCallback } from 'react'

export const SearchInput = React.memo(
  React.forwardRef<
    HTMLInputElement,
    {
      className?: string
    }
  >(({ className }, ref) => {
    const { setGlobalFilter, globalFilter } = useSandboxTableStore()

    useKeydown((e) => {
      if (e.key === '/') {
        e.preventDefault()
        if (ref && 'current' in ref) {
          ;(ref as React.RefObject<HTMLInputElement>).current?.focus()
        }
        return true
      }
    })

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
