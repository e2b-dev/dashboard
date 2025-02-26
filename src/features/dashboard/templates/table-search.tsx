'use client'

import { DebouncedInput } from '@/ui/primitives/input'
import { Kbd } from '@/ui/primitives/kbd'
import { useEffect, useRef } from 'react'
import { useTemplateTableStore } from './stores/table-store'

export const SearchInput = () => {
  const { globalFilter, setGlobalFilter } = useTemplateTableStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === '/') {
          e.preventDefault()
          inputRef.current?.focus()
          return true
        }
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [])

  return (
    <div className="relative w-full max-w-[420px]">
      <DebouncedInput
        value={globalFilter}
        onChange={(v) => setGlobalFilter(v as string)}
        placeholder="Find template..."
        className="h-10 w-full pr-14"
        debounce={500}
        ref={inputRef}
      />
      <Kbd keys={['/']} className="absolute top-1/2 right-2 -translate-y-1/2" />
    </div>
  )
}
