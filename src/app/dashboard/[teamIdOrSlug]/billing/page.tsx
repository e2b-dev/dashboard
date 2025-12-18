import SelectedPlan from '@/features/dashboard/billing/selected-plan'
import {
  extractAddonData,
  extractTierData,
} from '@/features/dashboard/billing/utils'
import { l } from '@/lib/clients/logger/logger'
import { getItems } from '@/server/billing/get-items'
import { getTeamLimits } from '@/server/team/get-team-limits'
import ErrorBoundary from '@/ui/error'

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
    // <Frame
    //   classNames={{
    //     wrapper: 'w-full max-md:p-0',
    //     frame: 'max-md:border-none',
    //   }}
    // >
    <SelectedPlan tierData={tierData} addonData={addonData} />
    // </Frame>
  )
}
