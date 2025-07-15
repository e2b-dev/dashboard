import { Badge } from '@/ui/primitives/badge'
import { Circle, ListFilter } from 'lucide-react'
import { Table } from '@tanstack/react-table'
import { SearchInput } from './table-search'
import SandboxesTableFilters from './table-filters'
import { PollingButton } from '@/ui/polling-button'
import { useSandboxTableStore } from './stores/table-store'
import { Template } from '@/types/api'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { SandboxesTable } from './table-config'

interface SandboxesHeaderProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  templates: Template[]
  table: SandboxesTable
}

export function SandboxesHeader({
  searchInputRef,
  templates,
  table,
}: SandboxesHeaderProps) {
  'use no memo'

  const { pollingInterval, setPollingInterval } = useSandboxTableStore()
  const [isRefreshing, startRefreshTransition] = useTransition()

  const router = useRouter()

  const handleRefresh = () => {
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  const hasActiveFilters = () => {
    return Object.keys(table.getState().columnFilters).length > 0
  }

  const showFilteredRowCount =
    hasActiveFilters() || table.getState().globalFilter

  return (
    <header className="mx-3 flex flex-col gap-4">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput ref={searchInputRef} className="max-w-[380px]" />
            <PollingButton
              pollingInterval={pollingInterval}
              onIntervalChange={setPollingInterval}
              onRefresh={handleRefresh}
              isPolling={isRefreshing}
            />
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="success"
              className="h-min w-fit gap-2 font-bold uppercase"
            >
              {table.getCoreRowModel().rows.length} running
              <Circle className="size-2 fill-current" />
            </Badge>
            {showFilteredRowCount && (
              <Badge
                variant="contrast-1"
                className="h-min w-fit gap-2 font-bold uppercase"
              >
                {table.getFilteredRowModel().rows.length} filtered
                <ListFilter className="size-3 !stroke-[3px]" />
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SandboxesTableFilters templates={templates} />
        </div>
      </div>
    </header>
  )
}
