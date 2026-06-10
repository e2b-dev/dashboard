import Addons from '@/features/dashboard/billing/addons'
import SelectedPlan from '@/features/dashboard/billing/selected-plan'
import { HydrateClient } from '@/trpc/server'

export default async function BillingPlanPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  await params

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectedPlan />
        <Addons />
      </main>
    </HydrateClient>
  )
}
