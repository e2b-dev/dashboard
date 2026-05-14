import { WebhookOverviewContent } from '@/features/dashboard/settings/webhooks/detail'
import {
  DEFAULT_WEBHOOK_STATS_RANGE,
  getWebhookStatsRange,
  loadWebhookStatsRangeParams,
} from '@/features/dashboard/settings/webhooks/detail/stats-range'
import { prefetch, trpc } from '@/trpc/server'

type WebhookOverviewPageProps = {
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WebhookOverviewPage({
  params,
  searchParams,
}: WebhookOverviewPageProps) {
  const { teamSlug, webhookId } = await params
  const { range: rangeParam } = await loadWebhookStatsRangeParams(searchParams)
  const range = rangeParam ?? DEFAULT_WEBHOOK_STATS_RANGE
  const rangeBounds = getWebhookStatsRange(range)

  prefetch(
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...rangeBounds,
    })
  )

  return (
    <WebhookOverviewContent
      teamSlug={teamSlug}
      webhookId={webhookId}
      initialRange={range}
      initialRangeBounds={rangeBounds}
    />
  )
}
