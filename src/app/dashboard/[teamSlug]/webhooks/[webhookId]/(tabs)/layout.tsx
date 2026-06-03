import { notFound } from 'next/navigation'
import { INCLUDE_ARGUS } from '@/configs/flags'
import { WebhookDetailLayout } from '@/features/dashboard/settings/webhooks/detail'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

type WebhookTabsLayoutProps = {
  children: React.ReactNode
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
}

export default async function WebhookTabsLayout({
  children,
  params,
}: WebhookTabsLayoutProps) {
  if (!INCLUDE_ARGUS) {
    return notFound()
  }

  const { teamSlug, webhookId } = await params

  prefetch(trpc.webhooks.get.queryOptions({ teamSlug, webhookId }))
  prefetch(
    trpc.webhooks.listDeliveries.queryOptions({ teamSlug, webhookId, limit: 1 })
  )

  return (
    <HydrateClient>
      <WebhookDetailLayout teamSlug={teamSlug} webhookId={webhookId}>
        {children}
      </WebhookDetailLayout>
    </HydrateClient>
  )
}
