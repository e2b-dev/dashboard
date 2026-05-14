import { WebhookOverviewContent } from '@/features/dashboard/settings/webhooks/detail'
import {
  getWebhookStatsApiBounds,
  getWebhookStatsRange,
  loadWebhookStatsTimeframeParams,
  normalizeWebhookStatsRangeBounds,
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
  const timeframeParams = await loadWebhookStatsTimeframeParams(searchParams)
  const fallbackRangeBounds = getWebhookStatsRange('24h')
  const rangeBounds = normalizeWebhookStatsRangeBounds({
    start: timeframeParams.start ?? fallbackRangeBounds.start,
    end: timeframeParams.end ?? fallbackRangeBounds.end,
  })
  const apiRangeBounds = getWebhookStatsApiBounds(rangeBounds)

  prefetch(
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...apiRangeBounds,
    })
  )

  return (
    <WebhookOverviewContent
      teamSlug={teamSlug}
      webhookId={webhookId}
      initialRangeBounds={rangeBounds}
    />
  )
}
