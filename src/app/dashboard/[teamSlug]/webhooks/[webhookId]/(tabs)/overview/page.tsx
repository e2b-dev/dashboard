import { WebhookOverviewContent } from '@/features/dashboard/settings/webhooks/detail'
import { prefetch, trpc } from '@/trpc/server'

type WebhookOverviewPageProps = {
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
}

// Builds the initial stats range, e.g. now -> last 24 hours.
const getDefaultStatsRange = () => {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export default async function WebhookOverviewPage({
  params,
}: WebhookOverviewPageProps) {
  const { teamSlug, webhookId } = await params
  const range = getDefaultStatsRange()

  prefetch(
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...range,
    })
  )

  return <WebhookOverviewContent teamSlug={teamSlug} webhookId={webhookId} />
}
