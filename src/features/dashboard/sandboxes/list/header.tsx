import { PollingButton } from '@/ui/polling-button'
import { Suspense } from 'react'
import {
  sandboxListPollingIntervals,
  useSandboxListTableStore,
} from './stores/table-store'
import type { SandboxListTable } from './table-config'
import SandboxesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface SandboxesHeaderProps {
  table: SandboxListTable
  onRefresh: () => void
  isRefreshing: boolean
}

export function SandboxesHeader({
  table,
  onRefresh,
  isRefreshing,
}: SandboxesHeaderProps) {
  'use no memo'

  const pollingInterval = useSandboxListTableStore(
    (state) => state.pollingInterval
  )
  const setPollingInterval = useSandboxListTableStore(
    (state) => state.setPollingInterval
  )
  const tableState = table.getState()
  const { columnFilters, globalFilter } = tableState

  const showFilteredRowCount = columnFilters.length > 0 || Boolean(globalFilter)

  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = table.getCoreRowModel().rows.length

  return (
    <header className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-1 sm:items-center">
        <div className="w-full sm:w-auto sm:shrink-0">
          <SearchInput />
        </div>

        <Suspense fallback={null}>
          <SandboxesTableFilters className="w-full sm:w-auto" />
        </Suspense>

        <div className="hidden w-2 shrink-0 sm:block" aria-hidden="true" />

        <span className="prose-label-highlight h-9 flex w-full min-w-0 items-center gap-1 uppercase sm:w-auto">
          {showFilteredRowCount ? (
            <>
              <span className="text-fg">
                {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
              </span>
              <span className="text-fg-tertiary"> · </span>
              <span className="text-fg-tertiary">{totalCount} total</span>
            </>
          ) : (
            <span className="text-fg-tertiary">{totalCount} total</span>
          )}
        </span>
      </div>

      <div className="flex w-full justify-start sm:w-auto sm:justify-start sm:self-center">
        <PollingButton
          intervals={sandboxListPollingIntervals}
          interval={pollingInterval}
          onIntervalChange={setPollingInterval}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </header>
  )
}
