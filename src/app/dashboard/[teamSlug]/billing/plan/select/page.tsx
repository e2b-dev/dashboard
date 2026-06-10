import SelectPlan from '@/features/dashboard/billing/select-plan'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BillingPlanSelectPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  const { teamSlug } = await params

  prefetch(trpc.billing.getItems.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectPlan />
      </main>
    </HydrateClient>
  )
}
