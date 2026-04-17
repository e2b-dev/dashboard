import { cn } from '@/lib/utils'
import { WebhookIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import WebhookTableRow from './table-row'
import type { Webhook } from './types'

interface WebhooksTableProps {
  webhooks: Webhook[]
  totalWebhookCount: number
  hasError: boolean
  hasActiveSearch: boolean
  className?: string
}

const WebhooksTable = ({
  webhooks,
  totalWebhookCount,
  hasError,
  hasActiveSearch,
  className,
}: WebhooksTableProps) => {
  const hasNoWebhooks = totalWebhookCount === 0
  const emptyMessage = hasError
    ? 'Failed to get webhooks. Try again or contact support.'
    : hasNoWebhooks
      ? 'No webhooks added yet'
      : hasActiveSearch
        ? 'No webhooks match your search.'
        : 'No webhooks added yet'

  return (
    <Table className={cn('w-full table-fixed', className)}>
      <colgroup>
        <col className="min-w-[260px] lg:w-[30%]" />
        <col className="min-w-[240px] lg:w-[50%]" />
        <col className="w-[120px] lg:w-[15%]" />
        <col className="w-[52px] lg:w-[5%]" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="border-stroke/80 hover:bg-transparent">
          <TableHead className="h-auto py-0 pb-2 align-top text-fg-tertiary font-sans! normal-case!">
            Name & URL
          </TableHead>
          <TableHead className="h-auto py-0 pb-2 align-top text-fg-tertiary font-sans! normal-case!">
            Events
          </TableHead>
          <TableHead className="h-auto py-0 pb-2 align-top text-right text-fg-tertiary font-sans! normal-case!">
            Added
          </TableHead>
          <TableHead className="h-auto py-0 pb-2 align-top text-fg-tertiary font-sans! normal-case!">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-b [&_tr:last-child]:border-stroke/80">
        {hasError || webhooks.length === 0 ? (
          <TableEmptyState colSpan={4}>
            <WebhookIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0',
                hasError
                  ? 'text-accent-error-highlight'
                  : hasNoWebhooks
                    ? 'text-fg'
                    : 'text-fg-tertiary opacity-80'
              )}
            />
            <span
              className={cn(
                hasError && 'text-accent-error-highlight',
                !hasError && 'text-fg'
              )}
            >
              {emptyMessage}
            </span>
          </TableEmptyState>
        ) : (
          webhooks.map((webhook, index) => (
            <WebhookTableRow
              key={webhook.id}
              className="h-12"
              index={index}
              webhook={webhook}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
}

export default WebhooksTable
