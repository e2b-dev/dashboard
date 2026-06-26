'use client'

import { useMemo, useState } from 'react'
import { DataRetentionExpired } from '@/features/dashboard/sandbox/common/data-retention-expired'
import { useSandboxContext } from '../context'
import { EventTypeFilter } from './event-type-filter'
import { SandboxEventsTable } from './table'
import { useSandboxEventFilters } from './use-sandbox-event-filters'

export const SandboxEventsView = () => {
  'use no memo'

  const { sandboxInfo, sandboxLifecycle, isSandboxInfoLoading } =
    useSandboxContext()
  const { order, orderAsc, setOrder, setTypes, types } =
    useSandboxEventFilters()
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  )

  const events = useMemo(() => {
    const lifecycleEvents = sandboxLifecycle?.events ?? []
    const typesSet = new Set<string>(types)
    const filteredEvents = lifecycleEvents.filter((event) =>
      typesSet.has(event.type)
    )
    // Sandbox lifecycle events are derived in ascending timestamp order.
    const orderedEvents = orderAsc
      ? filteredEvents
      : [...filteredEvents].reverse()

    return orderedEvents
  }, [orderAsc, sandboxLifecycle?.events, types])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-6 overflow-hidden border bg-bg">
        {sandboxInfo?.retentionExpired ? (
          <DataRetentionExpired />
        ) : (
          <>
            <EventTypeFilter types={types} onTypesChange={setTypes} />
            <div
              ref={setScrollContainer}
              className="min-h-0 flex-1 overflow-auto"
            >
              <SandboxEventsTable
                events={events}
                isLoading={isSandboxInfoLoading && !sandboxLifecycle}
                scrollContainer={scrollContainer}
                isTimestampDescending={order === 'desc'}
                onToggleTimestampSort={() =>
                  setOrder(order === 'desc' ? 'asc' : 'desc')
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
