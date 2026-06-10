import { Page } from '@/features/dashboard/layouts/page'
import { UsageLimits } from '@/features/dashboard/limits/usage-limits'
import { HydrateClient } from '@/trpc/server'

interface LimitsPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function LimitsPage({ params }: LimitsPageProps) {
  await params

  return (
    <HydrateClient>
      <Page>
        <UsageLimits />
      </Page>
    </HydrateClient>
  )
}
