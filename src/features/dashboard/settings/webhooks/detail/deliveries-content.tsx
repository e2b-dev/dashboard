'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import { WEBHOOK_EVENT_LABELS } from '@/features/dashboard/settings/webhooks/constants'
import { type TRPCRouterOutputs, useTRPC } from '@/trpc/client'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Card } from '@/ui/primitives/card'
import { WebhookIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
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

type DeliveryStatusFilter = 'all' | 'success' | 'failed'
type DeliveryGroup =
  TRPCRouterOutputs['webhooks']['listDeliveries']['groups'][number]
type DeliveryAttempt = NonNullable<DeliveryGroup['latestAttempt']>

type WebhookDeliveriesContentProps = {
  teamSlug: string
  webhookId: string
}

type DeliveryDetailPanelProps = {
  attempt: DeliveryAttempt | null
  group: DeliveryGroup | undefined
  isLoading: boolean
}

const DeliveryStatusFilterSchema = z.enum(['all', 'success', 'failed'])
const EMPTY_UUID = '00000000-0000-4000-8000-000000000000'

const deliveryStatusVariantMap: Record<
  DeliveryAttempt['deliveryStatus'],
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

const getEventLabel = (event: string) => {
  const parsed = SandboxLifecycleEventTypeSchema.safeParse(event)
  if (parsed.success) return WEBHOOK_EVENT_LABELS[parsed.data]

  return event
}

// Formats JSON strings for display, e.g. '{"a":1}' -> '{\n  "a": 1\n}'.
const formatMaybeJson = (value: string | null | undefined) => {
  if (!value) return '-'

  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const DeliveryStatusBadge = ({
  status,
}: {
  status: DeliveryAttempt['deliveryStatus']
}) => <Badge variant={deliveryStatusVariantMap[status]}>{status}</Badge>

const DeliveryStatusSelect = ({
  value,
  onChange,
}: {
  value: DeliveryStatusFilter
  onChange: (value: DeliveryStatusFilter) => void
}) => {
  const handleValueChange = (nextValue: string) => {
    const parsed = DeliveryStatusFilterSchema.safeParse(nextValue)
    if (!parsed.success) return

    onChange(parsed.data)
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="h-9 w-full md:w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="success">Success</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
      </SelectContent>
    </Select>
  )
}

const DeliveryDetailSection = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="flex flex-col gap-2">
    <h3 className="font-mono uppercase text-fg-tertiary prose-label">
      {title}
    </h3>
    {children}
  </section>
)

const DeliveryCodeBlock = ({ value }: { value: string | null | undefined }) => (
  <pre className="max-h-48 overflow-auto whitespace-pre-wrap border border-stroke bg-bg-1 p-3 font-mono text-fg-secondary prose-label-numeric">
    {formatMaybeJson(value)}
  </pre>
)

const DeliveryDetailPanel = ({
  attempt,
  group,
  isLoading,
}: DeliveryDetailPanelProps) => {
  if (!group || !attempt) {
    return (
      <Card
        variant="layer"
        className="flex min-h-[360px] items-center justify-center p-6 text-center text-fg-tertiary prose-body"
      >
        Select an event delivery to inspect the request and response.
      </Card>
    )
  }

  return (
    <Card variant="layer" className="flex min-h-0 flex-col gap-5 p-4">
      <div className="flex flex-col gap-3 border-b border-stroke pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-fg prose-body-highlight">
              {getEventLabel(group.eventType)}
            </p>
            <p className="truncate font-mono text-fg-tertiary prose-label-numeric">
              {group.eventId}
            </p>
          </div>
          <DeliveryStatusBadge status={attempt.deliveryStatus} />
        </div>
        <div className="grid gap-2 text-fg-secondary prose-body md:grid-cols-2">
          <span>HTTP {formatHttpStatus(attempt.httpStatusCode)}</span>
          <span>{attempt.durationMs.toLocaleString()}ms</span>
          <span>{formatDateTime(attempt.timestamp)}</span>
          <span>{group.attemptCount} attempts</span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-fg-tertiary prose-body">
          Loading delivery detail...
        </p>
      ) : null}

      <div className="flex min-h-0 flex-col gap-5 overflow-auto">
        <DeliveryDetailSection title="Attempt timeline">
          <div className="flex flex-col gap-2">
            {group.attempts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border border-stroke px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-fg-secondary prose-label-numeric">
                    {formatDateTime(item.timestamp)}
                  </p>
                  <p className="truncate text-fg-tertiary prose-body">
                    HTTP {formatHttpStatus(item.httpStatusCode)} ·{' '}
                    {item.durationMs.toLocaleString()}ms
                  </p>
                </div>
                <DeliveryStatusBadge status={item.deliveryStatus} />
              </div>
            ))}
          </div>
        </DeliveryDetailSection>

        <DeliveryDetailSection title="Request">
          <p className="break-all font-mono text-fg-secondary prose-label-numeric">
            {attempt.requestUrl}
          </p>
          <DeliveryCodeBlock value={attempt.requestHeaders} />
          <DeliveryCodeBlock value={attempt.requestBody} />
        </DeliveryDetailSection>

        <DeliveryDetailSection title="Response">
          <p className="text-fg-secondary prose-body">
            HTTP {formatHttpStatus(attempt.httpStatusCode)}
          </p>
          <DeliveryCodeBlock value={attempt.responseHeaders} />
          <DeliveryCodeBlock value={attempt.responseBody} />
        </DeliveryDetailSection>

        {attempt.errorMessage || attempt.errorClass ? (
          <DeliveryDetailSection title="Error">
            <p className="font-mono text-accent-error-highlight prose-label-numeric">
              {attempt.errorClass || 'delivery_error'}
            </p>
            <p className="text-fg-secondary prose-body">
              {attempt.errorMessage || 'No error message provided'}
            </p>
          </DeliveryDetailSection>
        ) : null}
      </div>
    </Card>
  )
}

export const WebhookDeliveriesContent = ({
  teamSlug,
  webhookId,
}: WebhookDeliveriesContentProps) => {
  const [deliveryStatus, setDeliveryStatus] =
    useState<DeliveryStatusFilter>('all')
  const [eventType, setEventType] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const trpc = useTRPC()
  const eventTypeFilter = eventType.trim() || undefined
  const deliveriesQuery = useInfiniteQuery(
    trpc.webhooks.listDeliveries.infiniteQueryOptions(
      {
        teamSlug,
        webhookId,
        limit: 25,
        deliveryStatus,
        eventType: eventTypeFilter,
      },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        placeholderData: keepPreviousData,
      }
    )
  )
  const groups = useMemo(
    () => deliveriesQuery.data?.pages.flatMap((page) => page.groups) ?? [],
    [deliveriesQuery.data]
  )
  const selectedGroup = useMemo(
    () =>
      groups.find((group) => group.eventId === selectedEventId) ?? groups[0],
    [groups, selectedEventId]
  )
  const selectedAttempt = selectedGroup?.latestAttempt ?? null
  const deliveryDetailQuery = useQuery(
    trpc.webhooks.getDelivery.queryOptions(
      {
        teamSlug,
        webhookId,
        deliveryId: selectedAttempt?.id ?? EMPTY_UUID,
      },
      {
        enabled: Boolean(selectedAttempt),
      }
    )
  )
  const detailedAttempt = deliveryDetailQuery.data?.delivery ?? selectedAttempt
  const hasActiveFilters = deliveryStatus !== 'all' || Boolean(eventTypeFilter)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <DeliveryStatusSelect
          value={deliveryStatus}
          onChange={(value) => {
            setDeliveryStatus(value)
            setSelectedEventId(null)
          }}
        />
        <Input
          className="h-9 md:w-[220px]"
          placeholder="Filter event type"
          value={eventType}
          onChange={(event) => {
            setEventType(event.target.value)
            setSelectedEventId(null)
          }}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card variant="layer" className="min-h-0 overflow-auto">
          <Table className="min-w-[760px] table-fixed">
            <colgroup>
              <col />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveriesQuery.isLoading ? (
                <TableLoadingState colSpan={6} label="Loading deliveries" />
              ) : groups.length === 0 ? (
                <TableEmptyState colSpan={6}>
                  <WebhookIcon className="size-4" />
                  <p className="prose-body-highlight text-fg">
                    {hasActiveFilters
                      ? 'No deliveries match these filters'
                      : 'No deliveries yet'}
                  </p>
                </TableEmptyState>
              ) : (
                groups.map((group) => {
                  const attempt = group.latestAttempt
                  const isSelected = group.eventId === selectedGroup?.eventId

                  return (
                    <TableRow
                      key={group.eventId}
                      data-state={isSelected ? 'selected' : undefined}
                      className="cursor-pointer hover:bg-bg-hover"
                      onClick={() => setSelectedEventId(group.eventId)}
                    >
                      <TableCell className="min-w-0">
                        <div className="min-w-0">
                          <p className="truncate text-fg prose-body-highlight">
                            {getEventLabel(group.eventType)}
                          </p>
                          <p className="truncate font-mono uppercase text-fg-tertiary prose-label-numeric">
                            {group.sandboxId}
                          </p>
                        </div>
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
                        {attempt
                          ? formatHttpStatus(attempt.httpStatusCode)
                          : '-'}
                      </TableCell>
                      <TableCell>{group.attemptCount}</TableCell>
                      <TableCell>
                        {attempt
                          ? `${attempt.durationMs.toLocaleString()}ms`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {attempt ? formatDateTime(attempt.timestamp) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <DeliveryDetailPanel
          attempt={detailedAttempt}
          group={selectedGroup}
          isLoading={deliveryDetailQuery.isFetching}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-fg-tertiary prose-body">
          Showing {groups.length.toLocaleString()} grouped events
        </p>
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
