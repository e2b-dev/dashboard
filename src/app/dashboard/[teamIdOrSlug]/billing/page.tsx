import { ConcurrentSandboxAddonSection } from '@/features/dashboard/billing/concurrent-sandboxes-addon-section'
import CustomerPortalLink from '@/features/dashboard/billing/customer-portal-link'
import BillingInvoicesTable from '@/features/dashboard/billing/invoices-table'
import BillingTierCard from '@/features/dashboard/billing/tier-card'
import { l } from '@/lib/clients/logger/logger'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getItems } from '@/server/billing/get-items'
import { getTeamLimits } from '@/server/team/get-team-limits'
import { TierLimits } from '@/types/billing'
import ErrorBoundary from '@/ui/error'
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

  const itemsRes = await getItems({ teamId })
  const limitsRes = await getTeamLimits({ teamId })

  if (!itemsRes.data || itemsRes.serverError) {
    l.error(
      {
        key: 'billing_page:failed_to_load_items',
        context: {
          serverError: itemsRes?.serverError,
        },
      },
      'billing_page: Failed to load billing items'
    )
  }

  if (!itemsRes?.data || !limitsRes?.data || itemsRes.serverError) {
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

  const { tiers, addons } = itemsRes.data

  const pro = tiers.available.find((t) => t.id === 'pro_v1')
  const base = tiers.available.find((t) => t.id === 'base_v1')

  const selectedTier = tiers.available.find((t) => t.id === tiers.current)

  const isOnProTier = selectedTier?.id === 'pro_v1'

  const availableConcurrentSandboxAddOns = addons.available.find(
    (a) => a.id === 'addon_500_sandboxes'
  )

  const isAbleToPurchaseConcurrentSandboxAddons =
    isOnProTier && !!availableConcurrentSandboxAddOns

  const currentAddons = addons.current || []

  if (!selectedTier) {
    l.error(
      {
        key: 'billing_page:missing_selected_tier',
        context: {
          currentTier: tiers.current,
          availableTiers: tiers.available?.map((t) => t.id) || [],
        },
      },
      'billing_page: Could not find selected tier in available tiers'
    )
  }

  if (!pro || !base) {
    l.error(
      {
        key: 'billing_page:missing_expected_tiers',
        context: {
          pro: !!pro,
          base: !!base,
          availableTiers: tiers.available?.map((t) => t.id) || [],
        },
      },
      'billing_page: Dashboard expected tier including "pro" and one tier including "base", but found pro: ' +
        !!pro +
        ', base: ' +
        !!base
    )
  }

  const generateBaseLimitsFeatures = (limits?: TierLimits): string[] => {
    if (!limits) return []
    return [
      `Up to ${limits.max_sandbox_duration_hours} hour${limits.max_sandbox_duration_hours ? 's' : ''} sandbox session length`,
      `Up to ${limits.sandbox_concurrency} concurrently running sandboxes`,
      `Up to ${limits.max_cpu} vCPUs per sandbox`,
      `Up to ${(limits.max_ram_mib || 0) / 1024} GB RAM per sandbox`,
      `${(limits.disk_size_mib || 0) / 1024} GB disk per sandbox`,
    ]
  }

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
            {base && (
              <BillingTierCard
                tier={{
                  id: base.id,
                  name: 'Hobby',
                  features: [
                    'Community support',
                    ...generateBaseLimitsFeatures(base.limits),
                  ],
                }}
                addons={[]}
                isSelected={base.id === selectedTier?.id}
                className="min-w-[280px] shadow-xl lg:w-1/2 xl:min-w-0 flex-1"
              />
            )}
            {pro && (
              <BillingTierCard
                tier={{
                  id: 'pro_v1',
                  name: 'Pro',
                  features: [
                    'Everything in the Hobby tier',
                    ...generateBaseLimitsFeatures(pro.limits),
                  ],
                }}
                addons={currentAddons.map((addon) => ({
                  label: addon.name,
                  price_cents: addon.price_cents,
                }))}
                isSelectable
                isSelected={pro.id === selectedTier?.id}
                className="min-w-[280px] shadow-xl lg:w-1/2 xl:min-w-0 flex-1"
                footer={
                  isAbleToPurchaseConcurrentSandboxAddons ? (
                    <ConcurrentSandboxAddonSection
                      priceCents={availableConcurrentSandboxAddOns.price_cents}
                      currentConcurrentSandboxesLimit={
                        limitsRes.data?.concurrentInstances
                      }
                    />
                  ) : undefined
                }
              />
            )}
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
