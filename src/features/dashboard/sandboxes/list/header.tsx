import { PollingButton } from '@/ui/polling-button'
import { Suspense } from 'react'
import { SandboxesTable } from './table-config'
import {
  sandboxesPollingIntervals,
  useSandboxTableStore,
} from './stores/table-store'
import SandboxesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface SandboxesHeaderProps {
  table: SandboxesTable
  onRefresh: () => void
  isRefreshing: boolean
}

export function SandboxesHeader({
  table,
  onRefresh,
  isRefreshing,
}: SandboxesHeaderProps) {
  'use no memo'

  const { pollingInterval, setPollingInterval } = useSandboxTableStore()

  const showFilteredRowCount =
    Object.keys(table.getState().columnFilters).length > 0 ||
    table.getState().globalFilter

  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = table.getCoreRowModel().rows.length

  return (
    <header className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
        <div className="shrink-0">
          <SearchInput />
        </div>

        <Suspense fallback={null}>
          <SandboxesTableFilters />
        </Suspense>

        <div className="w-2 shrink-0" aria-hidden="true" />

        <span className="prose-label-highlight uppercase h-9 flex items-center gap-1">
          {showFilteredRowCount ? (
            <>
              <span className="text-fg">
                {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
              </span>
              <span className="text-fg-tertiary"> · </span>
              <span className="text-fg-tertiary">
                {totalCount} total
              </span>
            </>
          ) : (
            <span className="text-fg-tertiary">
              {totalCount} total
            </span>
          )}
        </span>
      </div>

      <div className="flex w-full justify-end sm:w-auto sm:justify-start sm:self-center">
        <PollingButton
          intervals={sandboxesPollingIntervals}
          interval={pollingInterval}
          onIntervalChange={setPollingInterval}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </header>
  )
}
