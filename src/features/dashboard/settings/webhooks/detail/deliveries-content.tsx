'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import { useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  VirtualizedTableLoaderBody,
  VirtualizedTableRow,
} from '@/features/dashboard/common/virtualized-table-ui'
import {
  EventTypeFilter,
  eventTypeFilterParams,
  IdBadge,
  SandboxEventTypeBadge,
} from '@/features/dashboard/shared'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { type TRPCRouterOutputs, useTRPC } from '@/trpc/client'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
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

type WebhookDeliveryGroup =
  TRPCRouterOutputs['webhooks']['listDeliveries']['groups'][number]

const JsonValueSchema = z.unknown()
const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 240

const deliveryTableHeadClassName =
  'flex h-8 items-center whitespace-nowrap p-0 pr-12 [&>span]:whitespace-nowrap'
const deliveryTableCellClassName = 'flex h-8 items-center p-0 pr-12'
const deliveryDetailPopoverClassName =
  'min-w-0 max-w-[180px] normal-case text-fg-tertiary hover:text-fg hover:underline'

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
      <JsonPopover
        className={deliveryDetailPopoverClassName}
        json={parsedValue}
      >
        <span className="block w-full truncate">{parsedValue}</span>
      </JsonPopover>
    )
  }

  return (
    <JsonPopover className={deliveryDetailPopoverClassName} json={parsedValue}>
      <span className="block w-full truncate">{value}</span>
    </JsonPopover>
  )
}

interface WebhookDeliveriesTableProps {
  groups: WebhookDeliveryGroup[]
  isLoading: boolean
  emptyStateLabel: string
  scrollContainer: HTMLDivElement | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

const WebhookDeliveriesTable = ({
  groups,
  isLoading,
  emptyStateLabel,
  scrollContainer,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: WebhookDeliveriesTableProps) => {
  'use no memo'

  return (
    <Table className="grid min-w-[1464px] table-fixed">
      <TableHeader className="sticky top-0 z-10 grid bg-bg">
        <TableRow className="flex min-w-full">
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[100px]')}>
            Event
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[128px]')}>
            Sandbox ID
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[92px]')}>
            Status
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[144px]')}>
            Last attempt
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[92px]')}>
            Attempts
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[84px]')}>
            Duration
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[170px]')}>
            Request headers
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[170px]')}>
            Request body
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[144px]')}>
            Response HTTP
          </TableHead>
          <TableHead className={cn(deliveryTableHeadClassName, 'w-[170px]')}>
            Response headers
          </TableHead>
          <TableHead
            className={cn(deliveryTableHeadClassName, 'w-[170px] pr-0')}
          >
            Response body
          </TableHead>
        </TableRow>
      </TableHeader>

      {isLoading ? (
        <VirtualizedTableLoaderBody />
      ) : groups.length === 0 ? (
        <TableBody className="grid min-w-full [&>tr>td]:flex-1 [&>tr]:flex [&>tr]:min-w-full">
          <TableEmptyState colSpan={11}>
            <WebhookIcon className="size-4" />
            {emptyStateLabel}
          </TableEmptyState>
        </TableBody>
      ) : (
        <VirtualizedDeliveriesBody
          key={`${groups.length}-${scrollContainer ? 'ready' : 'pending'}`}
          groups={groups}
          scrollContainer={scrollContainer}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      )}
    </Table>
  )
}

interface VirtualizedDeliveriesBodyProps {
  groups: WebhookDeliveryGroup[]
  scrollContainer: HTMLDivElement | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

const VirtualizedDeliveriesBody = ({
  groups,
  scrollContainer,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: VirtualizedDeliveriesBodyProps) => {
  'use no memo'

  const initialRect = useMemo(() => {
    if (!scrollContainer) return undefined

    return {
      height: scrollContainer.clientHeight,
      width: scrollContainer.clientWidth,
    }
  }, [scrollContainer])

  useScrollLoadMore({
    scrollContainer,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  })

  const virtualizer = useVirtualizer({
    count: groups.length,
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainer,
    initialRect,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: 8,
  })

  return (
    <TableBody
      className="relative grid min-w-full [&_tr:last-child]:border-b-0 [&_tr]:border-b-0"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const group = groups[virtualRow.index]
        if (!group) return null

        return (
          <WebhookDeliveryRow
            key={virtualRow.key}
            group={group}
            virtualRow={virtualRow}
            virtualizer={virtualizer}
          />
        )
      })}
    </TableBody>
  )
}

interface WebhookDeliveryRowProps {
  group: WebhookDeliveryGroup
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

const WebhookDeliveryRow = ({
  group,
  virtualRow,
  virtualizer,
}: WebhookDeliveryRowProps) => {
  const attempt = group.latestAttempt

  return (
    <VirtualizedTableRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={ROW_HEIGHT_PX}
    >
      <TableCell
        className={cn(deliveryTableCellClassName, 'w-[100px] min-w-0')}
      >
        <div className="min-w-0">
          <SandboxEventTypeBadge type={group.eventType} />
        </div>
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[128px]')}>
        <IdBadge
          id={group.sandboxId}
          onCopied={() => toast(defaultSuccessToast('Sandbox ID copied'))}
        />
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[92px]')}>
        {attempt ? <DeliveryStatusBadge status={attempt.status} /> : '-'}
      </TableCell>
      <TableCell
        className={cn(
          deliveryTableCellClassName,
          'w-[144px] whitespace-nowrap'
        )}
      >
        {attempt ? formatDateTime(attempt.timestamp) : '-'}
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[92px]')}>
        {group.attemptCount}
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[84px]')}>
        {attempt ? `${attempt.durationMs.toLocaleString()}ms` : '-'}
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[170px]')}>
        <DeliveryDetailCell value={attempt?.requestHeaders} />
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[170px]')}>
        <DeliveryDetailCell value={attempt?.requestBody} />
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[144px]')}>
        {attempt ? formatHttpStatus(attempt.responseHttpStatusCode) : '-'}
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[170px]')}>
        <DeliveryDetailCell value={attempt?.responseHeaders} />
      </TableCell>
      <TableCell className={cn(deliveryTableCellClassName, 'w-[170px] pr-0')}>
        <DeliveryDetailCell value={attempt?.responseBody} />
      </TableCell>
    </VirtualizedTableRow>
  )
}

interface UseScrollLoadMoreParams {
  scrollContainer: HTMLDivElement | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

const useScrollLoadMore = ({
  scrollContainer,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: UseScrollLoadMoreParams) => {
  useEffect(() => {
    if (!scrollContainer) return

    const handleScroll = () => {
      const distanceToBottom =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight

      if (
        distanceToBottom < SCROLL_LOAD_THRESHOLD_PX &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        onLoadMore()
      }
    }

    const frame = requestAnimationFrame(handleScroll)
    scrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    return () => {
      cancelAnimationFrame(frame)
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [scrollContainer, hasNextPage, isFetchingNextPage, onLoadMore])
}

export const WebhookDeliveriesContent = ({
  teamSlug,
  webhookId,
}: WebhookDeliveriesContentProps) => {
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  )
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
  const handleLoadMore = useCallback(() => {
    if (!deliveriesQuery.hasNextPage || deliveriesQuery.isFetchingNextPage)
      return

    deliveriesQuery.fetchNextPage()
  }, [deliveriesQuery])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-row items-center gap-1 p-3 md:p-6">
        <DeliveryStatusFilter
          statuses={deliveryStatuses}
          onStatusesChange={handleDeliveryStatusesChange}
        />
        <EventTypeFilter
          types={eventTypes}
          onTypesChange={handleEventTypesChange}
        />
      </div>

      <div
        ref={setScrollContainer}
        className="min-h-0 flex-1 overflow-auto bg-bg px-3 md:px-6"
      >
        <WebhookDeliveriesTable
          groups={groups}
          isLoading={isDeliveriesLoading}
          emptyStateLabel={emptyStateLabel}
          scrollContainer={scrollContainer}
          hasNextPage={deliveriesQuery.hasNextPage}
          isFetchingNextPage={deliveriesQuery.isFetchingNextPage}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  )
}
