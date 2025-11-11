import CustomerPortalLink from '@/features/dashboard/billing/customer-portal-link'
import BillingInvoicesTable from '@/features/dashboard/billing/invoices-table'
import { PlanSection } from '@/features/dashboard/billing/plan-section'
import {
  extractAddonData,
  extractTierData,
} from '@/features/dashboard/billing/utils'
import { l } from '@/lib/clients/logger/logger'
import { getItems } from '@/server/billing/get-items'
import { getTeamLimits } from '@/server/team/get-team-limits'
import ErrorBoundary from '@/ui/error'
import Frame from '@/ui/frame'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'

export default async function BillingPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params

  const itemsRes = await getItems({ teamIdOrSlug })
  const limitsRes = await getTeamLimits({ teamIdOrSlug })

  // handle data loading errors
  if (itemsRes.serverError) {
    l.error(
      {
        key: 'billing_page:failed_to_load_items',
        context: { serverError: itemsRes.serverError },
      },
      'billing_page: Failed to load billing items'
    )
  }

  if (!itemsRes?.data || !limitsRes?.data) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Billing Error',
            message:
              itemsRes?.serverError ??
              'Failed to load billing information. Please contact support.',
          } satisfies Error
        }
        description="Could not load billing information"
      />
    )
  }

  // extract and validate billing data
  const tierData = extractTierData(itemsRes.data)
  const addonData = extractAddonData(itemsRes.data, tierData.selected?.id)

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
          <CustomerPortalLink className="bg-bg w-fit" />

          <PlanSection
            tierData={tierData}
            addonData={addonData}
            limits={limitsRes.data}
          />
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
            <BillingInvoicesTable params={params} />
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
}
