import Credits from '@/features/dashboard/billing/credits'
import SelectedPlan from '@/features/dashboard/billing/selected-plan'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BillingPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params

  prefetch(trpc.billing.getItems.queryOptions({ teamIdOrSlug }))
  prefetch(trpc.billing.getUsage.queryOptions({ teamIdOrSlug }))

  return (
    <HydrateClient>
      <main className="space-y-10">
        <SelectedPlan />
        <Credits />
      </main>
    </HydrateClient>
  )
}
