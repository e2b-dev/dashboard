'use client'

import { useCallback, useRef } from 'react'
import useKeydown from '@/lib/hooks/use-keydown'
import { DebouncedInput } from '@/ui/primitives/input'
import { Kbd } from '@/ui/primitives/kbd'
import { useTemplateTableStore } from './stores/table-store'

export const SearchInput = () => {
  const { globalFilter, setGlobalFilter } = useTemplateTableStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const handleGlobalFilterChange = useCallback(
    (value: string | number) => {
      setGlobalFilter(String(value))
    },
    [setGlobalFilter]
  )

  useKeydown((e) => {
    if (e.key === '/') {
      e.preventDefault()
      inputRef.current?.focus()
      return true
    }
  })

  return (
    <div className="relative w-full sm:w-[280px]">
      <DebouncedInput
        value={globalFilter}
        onChange={handleGlobalFilterChange}
        placeholder="Search by name or ID..."
        className="h-9 w-full pr-14"
        debounce={500}
        ref={inputRef}
      />
      <Kbd keys={['/']} className="absolute top-1/2 right-2 -translate-y-1/2" />
    </div>
  )
}
