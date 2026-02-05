import SelectPlan from '@/features/dashboard/billing/select-plan'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BillingPlanSelectPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params

  prefetch(trpc.billing.getItems.queryOptions({ teamIdOrSlug }))

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectPlan />
      </main>
    </HydrateClient>
  )
}
