import { notFound } from 'next/navigation'
import { INCLUDE_ARGUS } from '@/configs/flags'
import { Page } from '@/features/dashboard/layouts/page'
import { WebhooksPageContent } from '@/features/dashboard/settings/webhooks/webhooks-page-content'
import { HydrateClient } from '@/trpc/server'

interface WebhooksPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function WebhooksPage({ params }: WebhooksPageProps) {
  if (!INCLUDE_ARGUS) {
    return notFound()
  }

  await params

  return (
    <HydrateClient>
      <Page>
        <WebhooksPageContent />
      </Page>
    </HydrateClient>
  )
}
