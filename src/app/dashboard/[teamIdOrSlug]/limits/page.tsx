import UsageLimits from '@/features/dashboard/limits/usage-limits'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import Frame from '@/ui/frame'

interface LimitsPageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function LimitsPage({ params }: LimitsPageProps) {
  const { teamIdOrSlug } = await params

  prefetch(trpc.billing.getLimits.queryOptions({ teamIdOrSlug }))

  return (
    <HydrateClient>
      <Frame
        classNames={{
          frame: 'flex flex-col gap-4 max-md:border-none',
          wrapper: 'w-full max-md:p-0',
        }}
      >
        <UsageLimits />
      </Frame>
    </HydrateClient>
  )
}
