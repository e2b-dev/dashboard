import { Page } from '@/features/dashboard/layouts/page'
import { UsageLimits } from '@/features/dashboard/limits/usage-limits'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

interface LimitsPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function LimitsPage({ params }: LimitsPageProps) {
  const { teamSlug } = await params

  prefetch(trpc.billing.getLimits.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <Page>
        <UsageLimits />
      </Page>
    </HydrateClient>
  )
}
