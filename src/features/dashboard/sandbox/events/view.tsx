'use client'

import { useMemo } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useSandboxContext } from '../context'
import { EventTypeFilter } from './event-type-filter'
import { SandboxEventsTable } from './table'
import useSandboxEventFilters from './use-sandbox-event-filters'

export const SandboxEventsView = () => {
  const { sandboxLifecycle, isSandboxInfoLoading } = useSandboxContext()
  const { order, orderAsc, setOrder, setType, type } = useSandboxEventFilters()

  const events = useMemo(() => {
    const lifecycleEvents = sandboxLifecycle?.events ?? []
    const filteredEvents = type
      ? lifecycleEvents.filter((event) => event.type === type)
      : lifecycleEvents
    const orderedEvents = orderAsc
      ? filteredEvents
      : [...filteredEvents].reverse()

    return orderedEvents
  }, [orderAsc, sandboxLifecycle?.events, type])

  if (isSandboxInfoLoading && !sandboxLifecycle) {
    return <LoadingLayout />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:gap-6 md:p-6">
      <div className="flex w-full min-h-0 flex-wrap items-center gap-3">
        <EventTypeFilter type={type} onTypeChange={setType} />
      </div>

      <SandboxEventsTable
        events={events}
        isTimestampDescending={order === 'desc'}
        onToggleTimestampSort={() =>
          setOrder(order === 'desc' ? 'asc' : 'desc')
        }
      />
    </div>
  )
}
