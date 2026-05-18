'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { WebhookEventBadges } from '@/features/dashboard/settings/webhooks/event-badges'
import { Timestamp } from '@/features/dashboard/shared'
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
    })
  )
  const { webhook } = data
  const latestAttempt =
    latestDeliveryQuery.data?.groups[0]?.latestAttempt ?? null

  return (
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
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
          <Timestamp value={webhook.createdAt} />
        </DetailsItem>
        <DetailsItem label="Last event">
          {latestAttempt ? (
            <Timestamp value={latestAttempt.timestamp} />
          ) : (
            <p>-</p>
          )}
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
