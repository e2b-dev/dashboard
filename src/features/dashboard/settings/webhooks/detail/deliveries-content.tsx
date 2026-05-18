'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  EventTypeFilter,
  eventTypeFilterParams,
  IdBadge,
  SandboxEventTypeBadge,
} from '@/features/dashboard/shared'
import { useTRPC } from '@/trpc/client'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Card } from '@/ui/primitives/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { WebhookIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/ui/primitives/table'
import {
  deliveryFilterParams,
  WEBHOOK_DELIVERY_STATUSES,
  type WebhookDeliveryStatus,
} from './delivery-filter-params'

type WebhookDeliveriesContentProps = {
  teamSlug: string
  webhookId: string
}

const JsonValueSchema = z.unknown()

const deliveryStatusVariantMap: Record<
  WebhookDeliveryStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  failed: 'error',
  success: 'positive',
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const formatHttpStatus = (status: number | null | undefined) =>
  status === null || status === undefined ? 'No response' : String(status)

// Parses a JSON string safely, e.g. '{"ok":true}' -> { ok: true }.
const parseMaybeJson = (value: string | null | undefined) => {
  if (!value) return undefined

  try {
    const parsedValue: unknown = JSON.parse(value)
    const result = JsonValueSchema.safeParse(parsedValue)

    return result.success ? result.data : value
  } catch {
    return value
  }
}

const DeliveryStatusBadge = ({ status }: { status: WebhookDeliveryStatus }) => (
  <Badge variant={deliveryStatusVariantMap[status]}>{status}</Badge>
)

const getDeliveryStatusTriggerLabel = (statuses: WebhookDeliveryStatus[]) => {
  if (statuses.length === WEBHOOK_DELIVERY_STATUSES.length) return 'All'
  if (statuses.length === 0) return 'None'
  const [first] = statuses
  if (statuses.length === 1 && first)
    return first.charAt(0).toUpperCase() + first.slice(1)

  return `${statuses.length}/${WEBHOOK_DELIVERY_STATUSES.length}`
}

const DeliveryStatusFilter = ({
  statuses,
  onStatusesChange,
}: {
  statuses: WebhookDeliveryStatus[]
  onStatusesChange: (statuses: WebhookDeliveryStatus[]) => void
}) => {
  const isAllSelected = statuses.length === WEBHOOK_DELIVERY_STATUSES.length

  const toggleStatus = (status: WebhookDeliveryStatus) => {
    const next = statuses.includes(status)
      ? statuses.filter((item) => item !== status)
      : [...statuses, status]
    onStatusesChange(next)
  }

  const toggleAll = (checked: boolean) => {
    onStatusesChange(checked ? [...WEBHOOK_DELIVERY_STATUSES] : [])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="font-sans w-min normal-case">
          Status · {getDeliveryStatusTriggerLabel(statuses)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          onCheckedChange={toggleAll}
          onSelect={(event) => event.preventDefault()}
        >
          All statuses
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {WEBHOOK_DELIVERY_STATUSES.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={statuses.includes(status)}
            onCheckedChange={() => toggleStatus(status)}
            onSelect={(event) => event.preventDefault()}
          >
            <DeliveryStatusBadge status={status} />
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DeliveryDetailCell = ({
  value,
}: {
  value: string | null | undefined
}) => {
  const parsedValue = useMemo(() => parseMaybeJson(value), [value])

  if (parsedValue === undefined) {
    return <span className="text-fg-tertiary">n/a</span>
  }

  if (typeof parsedValue === 'string') {
    return (
      <span className="block max-w-[180px] truncate text-fg-tertiary">
        {parsedValue}
      </span>
    )
  }

  return (
    <JsonPopover
      className="min-w-0 max-w-[180px] normal-case text-fg-tertiary hover:text-fg hover:underline"
      json={parsedValue}
    >
      <span className="block w-full truncate">{value}</span>
    </JsonPopover>
  )
}

export const WebhookDeliveriesContent = ({
  teamSlug,
  webhookId,
}: WebhookDeliveriesContentProps) => {
  const [filters, setFilters] = useQueryStates(
    {
      ...deliveryFilterParams,
      ...eventTypeFilterParams,
    },
    { shallow: true }
  )
  const trpc = useTRPC()
  const deliveryStatuses = useMemo(
    () => filters.statuses ?? [...WEBHOOK_DELIVERY_STATUSES],
    [filters.statuses]
  )
  const hasSelectedDeliveryStatuses = deliveryStatuses.length > 0
  const hasAllDeliveryStatuses =
    deliveryStatuses.length === WEBHOOK_DELIVERY_STATUSES.length
  const deliveryStatusFilter = hasAllDeliveryStatuses
    ? undefined
    : deliveryStatuses
  const handleDeliveryStatusesChange = useCallback(
    (nextStatuses: WebhookDeliveryStatus[]) => {
      const nextHasAllStatuses =
        nextStatuses.length === WEBHOOK_DELIVERY_STATUSES.length

      setFilters({
        statuses: nextHasAllStatuses ? null : nextStatuses,
      })
    },
    [setFilters]
  )
  const eventTypes = useMemo(
    () => filters.types ?? [...SandboxLifecycleEventTypeSchema.options],
    [filters.types]
  )
  const hasSelectedEventTypes = eventTypes.length > 0
  const hasAllEventTypes =
    eventTypes.length === SandboxLifecycleEventTypeSchema.options.length
  const eventTypeFilter = hasAllEventTypes ? undefined : eventTypes
  const handleEventTypesChange = useCallback(
    (nextEventTypes: typeof eventTypes) => {
      const nextHasAllEventTypes =
        nextEventTypes.length === SandboxLifecycleEventTypeSchema.options.length

      setFilters({
        types: nextHasAllEventTypes ? null : nextEventTypes,
      })
    },
    [setFilters]
  )
  const deliveriesQuery = useInfiniteQuery(
    trpc.webhooks.listDeliveries.infiniteQueryOptions(
      {
        teamSlug,
        webhookId,
        limit: 25,
        deliveryStatus: deliveryStatusFilter,
        eventType: eventTypeFilter,
      },
      {
        enabled: hasSelectedEventTypes && hasSelectedDeliveryStatuses,
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        placeholderData: keepPreviousData,
      }
    )
  )
  const groups = useMemo(
    () =>
      hasSelectedEventTypes && hasSelectedDeliveryStatuses
        ? (deliveriesQuery.data?.pages.flatMap((page) => page.groups) ?? [])
        : [],
    [deliveriesQuery.data, hasSelectedDeliveryStatuses, hasSelectedEventTypes]
  )
  const hasActiveFilters = !hasAllDeliveryStatuses || !hasAllEventTypes
  const isDeliveriesLoading =
    hasSelectedEventTypes &&
    hasSelectedDeliveryStatuses &&
    deliveriesQuery.isLoading

  const emptyStateLabel = !hasSelectedDeliveryStatuses
    ? 'No statuses selected'
    : !hasSelectedEventTypes
      ? 'No event types selected'
      : hasActiveFilters
        ? 'No deliveries match these filters'
        : 'No deliveries yet'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-3 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <DeliveryStatusFilter
          statuses={deliveryStatuses}
          onStatusesChange={handleDeliveryStatusesChange}
        />
        <EventTypeFilter
          types={eventTypes}
          onTypesChange={handleEventTypesChange}
        />
      </div>

      <div className="min-h-0 flex-1">
        <Card variant="layer" className="min-h-0 overflow-auto">
          <Table className="min-w-[1860px] table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[220px]" />
              <col className="w-[220px]" />
              <col className="w-[150px]" />
              <col className="w-[220px]" />
              <col className="w-[220px]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="first:pl-4">Event</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last attempt</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Sandbox ID</TableHead>
                <TableHead>Request headers</TableHead>
                <TableHead>Request body</TableHead>
                <TableHead>Response HTTP</TableHead>
                <TableHead>Response headers</TableHead>
                <TableHead>Response body</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDeliveriesLoading ? (
                <TableLoadingState colSpan={12} label="Loading deliveries" />
              ) : groups.length === 0 ? (
                <TableEmptyState colSpan={12}>
                  <WebhookIcon className="size-4" />
                  <p className="prose-body-highlight text-fg">
                    {emptyStateLabel}
                  </p>
                </TableEmptyState>
              ) : (
                groups.map((group) => {
                  const attempt = group.latestAttempt

                  return (
                    <TableRow key={group.eventId}>
                      <TableCell className="min-w-0 first:pl-4">
                        <div className="min-w-0">
                          <SandboxEventTypeBadge type={group.eventType} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <IdBadge id={attempt?.eventId ?? group.eventId} />
                      </TableCell>
                      <TableCell>
                        {attempt ? (
                          <DeliveryStatusBadge
                            status={attempt.deliveryStatus}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {attempt ? formatDateTime(attempt.timestamp) : '-'}
                      </TableCell>
                      <TableCell>{group.attemptCount}</TableCell>
                      <TableCell>
                        {attempt
                          ? `${attempt.durationMs.toLocaleString()}ms`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <IdBadge id={group.sandboxId} />
                      </TableCell>
                      <TableCell>
                        <DeliveryDetailCell value={attempt?.requestHeaders} />
                      </TableCell>
                      <TableCell>
                        <DeliveryDetailCell value={attempt?.requestBody} />
                      </TableCell>
                      <TableCell>
                        {attempt
                          ? formatHttpStatus(attempt.httpStatusCode)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DeliveryDetailCell value={attempt?.responseHeaders} />
                      </TableCell>
                      <TableCell>
                        <DeliveryDetailCell value={attempt?.responseBody} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={!deliveriesQuery.hasNextPage}
            loading={
              deliveriesQuery.isFetchingNextPage ? 'Loading more' : undefined
            }
            onClick={() => deliveriesQuery.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      </div>
    </div>
  )
}
