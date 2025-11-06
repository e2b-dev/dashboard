import { revalidateSandboxes } from '@/server/sandboxes/sandbox-actions'
import { PollingButton } from '@/ui/polling-button'
import { Badge } from '@/ui/primitives/badge'
import { Circle, ListFilter } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useDashboard } from '../../context'
import {
  sandboxesPollingIntervals,
  useSandboxTableStore,
} from './stores/table-store'
import { SandboxesTable } from './table-config'
import SandboxesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface SandboxesHeaderProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  table: SandboxesTable
}

export function SandboxesHeader({
  searchInputRef,
  table,
}: SandboxesHeaderProps) {
  'use no memo'

  const { team } = useDashboard()

  const { pollingInterval, setPollingInterval } = useSandboxTableStore()

  const { execute: revalidateSandboxesAction, isPending } =
    useAction(revalidateSandboxes)

  const handleRefresh = () => {
    if (!team) return

    revalidateSandboxesAction({ teamId: team.id })
  }

  const hasActiveFilters = () => {
    return Object.keys(table.getState().columnFilters).length > 0
  }

  const showFilteredRowCount =
    hasActiveFilters() || table.getState().globalFilter

  return (
    <header className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput ref={searchInputRef} className="max-w-[380px]" />
            <PollingButton
              intervals={sandboxesPollingIntervals}
              pollingInterval={pollingInterval}
              onIntervalChange={setPollingInterval}
              onRefresh={handleRefresh}
              isPolling={isPending}
            />
          </div>

          <div className="flex items-center gap-3">
            <Badge size="lg" variant="positive" className="uppercase">
              {table.getCoreRowModel().rows.length} running
              <Circle className="size-2 fill-current" />
            </Badge>
            {showFilteredRowCount && (
              <Badge size="lg" variant="info" className="uppercase">
                {table.getFilteredRowModel().rows.length} filtered
                <ListFilter className="size-3 !stroke-[3px]" />
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SandboxesTableFilters />
        </div>
      </div>
    </header>
  )
}
