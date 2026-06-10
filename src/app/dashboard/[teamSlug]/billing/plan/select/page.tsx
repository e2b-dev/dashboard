import SelectPlan from '@/features/dashboard/billing/select-plan'
import { HydrateClient } from '@/trpc/server'

export default async function BillingPlanSelectPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  await params

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectPlan />
      </main>
    </HydrateClient>
  )
}
