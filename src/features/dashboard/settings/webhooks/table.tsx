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
import { WebhookTableRow } from './table-row'
import type { Webhook } from './types'

interface WebhooksTableProps {
  webhooks: Webhook[]
  totalWebhookCount: number
  className?: string
}

const headerCellClassName =
  'h-[17px] p-0 pb-2 align-top font-sans! text-[12px] leading-[17px] font-normal text-fg-tertiary uppercase'

const WebhooksTable = ({
  webhooks,
  totalWebhookCount,
  className,
}: WebhooksTableProps) => {
  const hasNoWebhooks = totalWebhookCount === 0
  const emptyMessage = hasNoWebhooks
    ? 'No webhooks added yet'
    : 'No webhooks match your search.'

  return (
    <Table className={cn('w-full table-fixed', className)}>
      <colgroup>
        <col />
        <col className="w-[264px]" />
        <col className="w-[136px]" />
        <col className="w-10" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="h-[25px] border-0 hover:bg-transparent">
          <TableHead className={headerCellClassName}>NAME & URL</TableHead>
          <TableHead className={cn(headerCellClassName, 'pr-12')}>
            EVENTS
          </TableHead>
          <TableHead className={cn(headerCellClassName, 'text-left')}>
            ADDED
          </TableHead>
          <TableHead className={headerCellClassName}>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody
        className={cn(
          webhooks.length > 0 &&
            '[&_tr:last-child]:border-b [&_tr:last-child]:border-stroke/80'
        )}
      >
        {webhooks.length === 0 ? (
          <TableEmptyState colSpan={4}>
            <WebhookIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0',
                hasNoWebhooks ? 'text-fg' : 'text-fg-tertiary opacity-80'
              )}
            />
            <p className="prose-body-highlight text-fg">{emptyMessage}</p>
          </TableEmptyState>
        ) : (
          webhooks.map((webhook) => (
            <WebhookTableRow key={webhook.id} webhook={webhook} />
          ))
        )}
      </TableBody>
    </Table>
  )
}

export default WebhooksTable
