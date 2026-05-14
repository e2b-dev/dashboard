'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { WebhookEventBadges } from '@/features/dashboard/settings/webhooks/event-badges'
import { IdBadge } from '@/features/dashboard/shared'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import {
  formatChartTimestampLocal,
  formatDate,
  formatUTCTimestamp,
} from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { DetailsItem, DetailsRow } from '../../../layouts/details-row'

type WebhookDetailHeaderProps = {
  teamSlug: string
  webhookId: string
}

export const WebhookDetailHeader = ({
  teamSlug,
  webhookId,
}: WebhookDetailHeaderProps) => {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.webhooks.get.queryOptions({ teamSlug, webhookId })
  )
  const latestDeliveryQuery = useSuspenseQuery(
    trpc.webhooks.listDeliveries.queryOptions({
      teamSlug,
      webhookId,
      limit: 1,
      deliveryStatus: 'all',
    })
  )
  const { webhook } = data
  const latestAttempt =
    latestDeliveryQuery.data?.groups[0]?.latestAttempt ?? null
  const latestEventTimestamp = latestAttempt?.timestamp
  const latestEventLabel = latestEventTimestamp
    ? `${formatChartTimestampLocal(latestEventTimestamp, true)}, ${formatChartTimestampLocal(latestEventTimestamp)}`
    : '-'
  const latestEventTitle = latestEventTimestamp
    ? formatUTCTimestamp(new Date(latestEventTimestamp))
    : undefined
  const handleIdCopied = () =>
    toast(defaultSuccessToast('Webhook ID copied to clipboard'))

  return (
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
        <DetailsItem label="ID">
          <IdBadge
            id={webhook.id}
            copyAriaLabel="Copy full webhook ID"
            onCopied={handleIdCopied}
          />
        </DetailsItem>
        <DetailsItem label="URL" className="min-w-0 max-w-[360px]">
          <p
            className="truncate font-mono text-fg-secondary"
            title={webhook.url}
          >
            {webhook.url}
          </p>
        </DetailsItem>
        <DetailsItem label="Events">
          <div className="flex flex-wrap items-center gap-1">
            <WebhookEventBadges events={webhook.events} />
          </div>
        </DetailsItem>
        <DetailsItem label="Created">
          <p>{formatDate(new Date(webhook.createdAt), 'MMM d, yyyy') ?? '-'}</p>
        </DetailsItem>
        <DetailsItem label="Last event">
          <p title={latestEventTitle}>{latestEventLabel}</p>
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
