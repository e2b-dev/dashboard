import { WebhookOverviewContent } from '@/features/dashboard/settings/webhooks/detail'
import {
  getValidWebhookStatsBounds,
  getWebhookStatsApiBounds,
  getWebhookStatsRange,
  loadWebhookStatsTimeframeParams,
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
  const fallbackRangeBounds = getWebhookStatsRange('this-week')
  const rangeBounds = getValidWebhookStatsBounds({
    start: timeframeParams.start ?? fallbackRangeBounds.start,
    end: timeframeParams.end ?? fallbackRangeBounds.end,
  })
  const apiRangeBounds = getWebhookStatsApiBounds(rangeBounds)

  prefetch(
    trpc.webhooks.listDeliveries.queryOptions({
      teamSlug,
      webhookId,
      limit: 100,
      orderAsc: true,
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
