import { useSandboxListTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import useKeydown from '@/lib/hooks/use-keydown'
import { DebouncedInput } from '@/ui/primitives/input'
import { Kbd } from '@/ui/primitives/kbd'
import { useRef } from 'react'

export const SearchInput = () => {
  const globalFilter = useSandboxListTableStore((state) => state.globalFilter)
  const setGlobalFilter = useSandboxListTableStore(
    (state) => state.setGlobalFilter
  )
  const inputRef = useRef<HTMLInputElement>(null)

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
        onChange={(v) => setGlobalFilter(v as string)}
        placeholder="Search by ID"
        className="h-9 w-full pr-14"
        debounce={500}
        ref={inputRef}
      />
      <Kbd keys={['/']} className="absolute top-1/2 right-2 -translate-y-1/2" />
    </div>
  )
}
