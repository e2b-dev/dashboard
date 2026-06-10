import Credits from '@/features/dashboard/billing/credits'
import Invoices from '@/features/dashboard/billing/invoices'
import SelectedPlan from '@/features/dashboard/billing/selected-plan'
import { HydrateClient } from '@/trpc/server'

export default async function BillingPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  await params

  return (
    <HydrateClient>
      <main className="space-y-10 p-3">
        <SelectedPlan />
        <Credits />
        <Invoices />
      </main>
    </HydrateClient>
  )
}
