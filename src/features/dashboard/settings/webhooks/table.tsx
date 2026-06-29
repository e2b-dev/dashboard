import { cn } from '@/lib/utils'
import { WebhookIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/ui/primitives/table'
import { WebhookTableRow } from './table-row'
import type { Webhook } from './types'

interface WebhooksTableProps {
  webhooks: Webhook[]
  totalWebhookCount: number
  isLoading?: boolean
  className?: string
}

const headerCellClassName =
  'h-[17px] p-0 pb-0.5 align-top font-sans! text-[12px] leading-[17px] text-left font-normal text-fg-tertiary uppercase'

export const WebhooksTable = ({
  webhooks,
  totalWebhookCount,
  isLoading = false,
  className,
}: WebhooksTableProps) => {
  const hasNoWebhooks = totalWebhookCount === 0
  const emptyMessage = hasNoWebhooks
    ? 'No webhooks added yet'
    : 'No webhooks match your search'

  return (
    <Table
      className={cn(
        'w-full min-w-[720px] table-fixed [&_td:not(:last-child)]:pr-12 [&_th:not(:last-child)]:pr-12',
        className
      )}
    >
      <colgroup>
        <col />
        <col className="w-[264px]" />
        <col className="w-[184px]" />
        <col className="w-10" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="border-0">
          <TableHead className={headerCellClassName}>NAME & URL</TableHead>
          <TableHead className={headerCellClassName}>EVENTS</TableHead>
          <TableHead className={headerCellClassName}>ADDED</TableHead>
          <TableHead className={headerCellClassName}>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody
        className={cn(
          webhooks.length > 0 && [
            '[&_tr]:border-stroke',
            '[&_tr:last-child]:border-b [&_tr:last-child]:border-stroke',
            '[&_tr:hover]:border-b-transparent',
            '[&_tr:last-child:hover]:border-b-transparent',
            '[&_tr:has(+_tr:hover)]:border-b-transparent',
            '[&_tr:has(button[aria-haspopup=menu][data-state=open])]:border-b-transparent',
            '[&_tr:last-child:has(button[aria-haspopup=menu][data-state=open])]:border-b-transparent',
            '[&_tr:has(+_tr_button[aria-haspopup=menu][data-state=open])]:border-b-transparent',
          ]
        )}
      >
        {isLoading ? (
          <TableLoadingState
            className="pt-2"
            colSpan={4}
            label="Loading webhooks"
          />
        ) : webhooks.length === 0 ? (
          <TableEmptyState className="pt-2" colSpan={4}>
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
