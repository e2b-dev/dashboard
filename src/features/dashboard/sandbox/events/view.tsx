'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { HELP_URLS } from '@/configs/urls'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from '@/ui/primitives/icons'
import { EventTypeFilter } from './event-type-filter'
import { SANDBOX_EVENTS_PAGE_SIZE } from './filter-params'
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
  const trpc = useTRPC()
  const { teamSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const { offset, order, orderAsc, setOffset, setOrder, setType, type } =
    useSandboxEventFilters()

  const { data, isPending, isFetching } = useQuery(
    trpc.sandbox.events.queryOptions(
      {
        teamSlug,
        sandboxId,
        type: type ?? undefined,
        offset,
        limit: SANDBOX_EVENTS_PAGE_SIZE,
        orderAsc,
      },
      {
        refetchOnWindowFocus: false,
      }
    )
  )

  if (isPending && !data) {
    return <LoadingLayout />
  }

  const events = data?.events ?? []
  const page = Math.floor(offset / SANDBOX_EVENTS_PAGE_SIZE) + 1
  const hasPreviousPage = data?.hasPreviousPage ?? offset > 0
  const hasNextPage = data?.hasNextPage ?? false

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:gap-6 md:p-6">
      <div className="flex w-full min-h-0 flex-wrap items-center justify-between gap-3">
        <EventTypeFilter type={type} onTypeChange={setType} />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPreviousPage || isFetching}
            onClick={() =>
              setOffset(Math.max(offset - SANDBOX_EVENTS_PAGE_SIZE, 0))
            }
          >
            <ChevronLeftIcon className="size-3.5" />
            Previous
          </Button>
          <span className="text-fg-tertiary whitespace-nowrap text-xs uppercase">
            Page {page}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNextPage || isFetching}
            onClick={() => setOffset(offset + SANDBOX_EVENTS_PAGE_SIZE)}
          >
            Next
            <ChevronRightIcon className="size-3.5" />
          </Button>
          <LifecycleEventsDocsLink />
        </div>
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
