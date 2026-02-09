import Addons from '@/features/dashboard/billing/addons'
import SelectedPlan from '@/features/dashboard/billing/selected-plan'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BillingPlanPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params

  prefetch(trpc.billing.getItems.queryOptions({ teamIdOrSlug }))
  prefetch(trpc.billing.getTeamLimits.queryOptions({ teamIdOrSlug }))

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectedPlan />
        <Addons />
      </main>
    </HydrateClient>
  )
}
