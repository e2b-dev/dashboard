'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { HELP_URLS } from '@/configs/urls'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { Button } from '@/ui/primitives/button'
import { ExternalLinkIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'
import { EventTypeFilter } from './event-type-filter'
import { SandboxEventsTable } from './table'
import useSandboxEventFilters from './use-sandbox-event-filters'

const LifecycleEventsDocsLink = () => {
  return (
    <Button asChild size="sm" variant="outline" className="shrink-0">
      <Link href={HELP_URLS.SANDBOX_LIFECYCLE_EVENTS} target="_blank">
        API docs
        <ExternalLinkIcon className="size-3.5" />
      </Link>
    </Button>
  )
}

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
      <div className="flex w-full min-h-0 flex-wrap items-center justify-between gap-3">
        <EventTypeFilter type={type} onTypeChange={setType} />

        <LifecycleEventsDocsLink />
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
