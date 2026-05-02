import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { INCLUDE_ARGUS } from '@/configs/flags'
import { Page } from '@/features/dashboard/layouts/page'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { WebhooksPageContent } from '@/features/dashboard/settings/webhooks/webhooks-page-content'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { CatchErrorBoundary } from '@/ui/error'

interface WebhooksPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function WebhooksPage({ params }: WebhooksPageProps) {
  if (!INCLUDE_ARGUS) {
    return notFound()
  }

  const { teamSlug } = await params

  prefetch(trpc.webhooks.list.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <Page>
        <CatchErrorBoundary>
          <Suspense fallback={<LoadingLayout />}>
            <WebhooksPageContent teamSlug={teamSlug} />
          </Suspense>
        </CatchErrorBoundary>
      </Page>
    </HydrateClient>
  )
}
