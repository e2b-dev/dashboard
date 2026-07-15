import { Suspense } from 'react'
import { PollingButton } from '@/ui/polling-button'
import { OpenSandboxDialog } from './open-sandbox-dialog'
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
  hasNextPage?: boolean
}

export function SandboxesHeader({
  table,
  onRefresh,
  isRefreshing,
  hasNextPage = false,
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

  const isFiltered = columnFilters.length > 0 || Boolean(globalFilter)

  // With server-side pagination the row models only hold the loaded pages,
  // so "N+" marks the count as a lower bound until all pages are in.
  const visibleCount = isFiltered
    ? table.getFilteredRowModel().rows.length
    : table.getCoreRowModel().rows.length
  const countLabel = `${visibleCount.toLocaleString('en-US')}${hasNextPage ? '+' : ''}`
  const countNoun = visibleCount === 1 && !hasNextPage ? 'sandbox' : 'sandboxes'

  return (
    <header className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-start md:justify-between">
      <div className="flex min-w-0 flex-1 basis-full flex-wrap items-start gap-1 md:basis-0 md:items-center">
        <div className="w-full sm:w-auto sm:shrink-0">
          <SearchInput />
        </div>

        <Suspense fallback={null}>
          <SandboxesTableFilters
            className="w-full min-w-0 sm:w-auto"
            showStatusFilter={Boolean(table.getColumn('status'))}
          />
        </Suspense>

        <div className="hidden w-2 shrink-0 sm:block" aria-hidden="true" />

        <span className="prose-label-highlight h-9 flex w-full min-w-0 items-center gap-1 uppercase sm:w-auto">
          <span className={isFiltered ? 'text-fg' : 'text-fg-tertiary'}>
            {countLabel} {countNoun}
          </span>
          {isFiltered ? (
            <span className="text-fg-tertiary"> · filtered</span>
          ) : null}
        </span>
      </div>

      <div className="flex w-full items-center justify-between gap-2 md:ml-auto md:w-auto md:shrink-0 md:justify-start md:self-center">
        <PollingButton
          intervals={sandboxListPollingIntervals}
          interval={pollingInterval}
          onIntervalChange={setPollingInterval}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <OpenSandboxDialog />
      </div>
    </header>
  )
}
