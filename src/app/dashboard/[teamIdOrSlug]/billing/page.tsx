import { TIERS } from '@/configs/tiers'
import CustomerPortalLink from '@/features/dashboard/billing/customer-portal-link'
import BillingInvoicesTable from '@/features/dashboard/billing/invoices-table'
import BillingTierCard from '@/features/dashboard/billing/tier-card'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import Frame from '@/ui/frame'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Suspense } from 'react'

export default async function BillingPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <Frame
      classNames={{
        wrapper: 'w-full max-md:p-0',
        frame: 'max-md:border-none',
      }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            Manage your current plan and subscription details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Suspense fallback={null}>
            <CustomerPortalLink className="bg-bg w-fit" />
          </Suspense>

          <div className="mt-3 flex flex-col gap-12 overflow-x-auto max-lg:mb-6 lg:flex-row">
            {TIERS.map((tier) => (
              <BillingTierCard
                key={tier.id}
                tier={tier}
                isHighlighted={tier.id === 'pro_v1'}
                className="min-w-[280px] shadow-xl lg:w-1/2 xl:min-w-0 flex-1"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your team's billing history and invoices.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto">
            <BillingInvoicesTable teamId={teamId} />
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
}
