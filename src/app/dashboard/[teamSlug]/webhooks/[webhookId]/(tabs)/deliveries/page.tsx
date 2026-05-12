import { WebhookDeliveriesContent } from '@/features/dashboard/settings/webhooks/detail'
import { prefetch, trpc } from '@/trpc/server'

type WebhookDeliveriesPageProps = {
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
}

export default async function WebhookDeliveriesPage({
  params,
}: WebhookDeliveriesPageProps) {
  const { teamSlug, webhookId } = await params

  prefetch(
    trpc.webhooks.listDeliveries.queryOptions({
      teamSlug,
      webhookId,
      limit: 25,
      offset: 0,
      deliveryStatus: 'all',
    })
  )

  return <WebhookDeliveriesContent teamSlug={teamSlug} webhookId={webhookId} />
}
