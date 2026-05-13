import { WebhookOverviewContent } from '@/features/dashboard/settings/webhooks/detail'
import { getWebhookStatsRange } from '@/features/dashboard/settings/webhooks/detail/stats-range'
import { prefetch, trpc } from '@/trpc/server'

type WebhookOverviewPageProps = {
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
}

export default async function WebhookOverviewPage({
  params,
}: WebhookOverviewPageProps) {
  const { teamSlug, webhookId } = await params
  const range = getWebhookStatsRange('24h')

  prefetch(
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...range,
    })
  )

  return (
    <WebhookOverviewContent
      teamSlug={teamSlug}
      webhookId={webhookId}
      initialRangeBounds={range}
    />
  )
}
