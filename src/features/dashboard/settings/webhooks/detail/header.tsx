'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { WebhookEventBadges } from '@/features/dashboard/settings/webhooks/event-badges'
import { Timestamp } from '@/features/dashboard/shared'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import CopyButton from '@/ui/copy-button'
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
        <DetailsItem label="Name" className="min-w-0 max-w-[240px]">
          <p className="truncate" title={webhook.name}>
            {webhook.name}
          </p>
        </DetailsItem>
        <DetailsItem label="URL" className="min-w-0 max-w-[360px]">
          <div className="flex min-w-0 items-center gap-1">
            <p
              className="truncate font-mono text-fg-secondary"
              title={webhook.url}
            >
              {webhook.url}
            </p>
            <CopyButton
              aria-label="Copy webhook URL"
              onCopy={() => toast(defaultSuccessToast('Webhook URL copied'))}
              value={webhook.url}
            />
          </div>
        </DetailsItem>
        <DetailsItem label="Events">
          <div className="flex flex-wrap items-center gap-1">
            <WebhookEventBadges events={webhook.events} />
          </div>
        </DetailsItem>
        <DetailsItem label="Created">
          <div className="flex items-center gap-1">
            <Timestamp value={webhook.createdAt} />
            <CopyButton
              aria-label="Copy created timestamp"
              onCopy={() => toast(defaultSuccessToast('Timestamp copied'))}
              value={webhook.createdAt}
            />
          </div>
        </DetailsItem>
        <DetailsItem label="Last event">
          {latestAttempt ? (
            <div className="flex items-center gap-1">
              <Timestamp value={latestAttempt.timestamp} />
              <CopyButton
                aria-label="Copy last event timestamp"
                onCopy={() => toast(defaultSuccessToast('Timestamp copied'))}
                value={latestAttempt.timestamp}
              />
            </div>
          ) : (
            <p>-</p>
          )}
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
