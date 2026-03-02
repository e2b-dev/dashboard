'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import type { AddonInfo } from '@/types/billing.types'
import HelpTooltip from '@/ui/help-tooltip'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { InfoIcon, SandboxIcon, UpgradeIcon } from '@/ui/primitives/icons'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useDashboard } from '../context'
import { ConcurrentSandboxAddOnPurchaseDialog } from './concurrent-sandboxes-addon-dialog'
import { ADDON_500_SANDBOXES_ID, TIER_PRO_ID } from './constants'
import { useBillingItems, useTeamLimits } from './hooks'
import { formatAddonQuantity } from './utils'

interface AddonItemProps {
  name: string
  priceCents: number
  description: string
  actions?: React.ReactNode
}

function AddonItem({ name, priceCents, description, actions }: AddonItemProps) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex size-9 items-center justify-center border border-stroke">
          <SandboxIcon className="size-4 text-fg-tertiary shrink-0" />
        </div>

        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="prose-value-small text-fg uppercase">{name}</span>
            <Badge variant="default">
              {formatCurrency(priceCents / 100)}/MO
            </Badge>
          </div>
          <p className="prose-body text-fg-tertiary">{description}</p>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0 sm:ml-auto">
          {actions}
        </div>
      )}
    </div>
  )
}

interface ActiveAddonsProps {
  addons: Array<{ label: string; price_cents: number }>
}

function ActiveAddons({ addons }: ActiveAddonsProps) {
  if (addons.length === 0) return null

  return (
    <div className="flex flex-col">
      <Label className="prose-label text-fg-tertiary">Active Add-ons</Label>
      <div className="divide-y divide-stroke border-b border-stroke">
        {addons.map((addon, index) => (
          <AddonItem
            key={index}
            name={addon.label}
            priceCents={addon.price_cents}
            description="Increases concurrent sandbox limit by 500"
          />
        ))}
      </div>
    </div>
  )
}

interface AvailableAddonsProps {
  addon: AddonInfo
  onAdd: () => void
  isLoading: boolean
  disabled: boolean
}

function AvailableAddons({
  addon,
  onAdd,
  isLoading,
  disabled,
}: AvailableAddonsProps) {
  return (
    <div className="flex flex-col">
      <Label className="prose-label text-fg-tertiary">Available Add-ons</Label>
      <div>
        <AddonItem
          name="+500 Sandboxes"
          priceCents={addon.price_cents}
          description="Increases concurrent sandbox limit by 500"
          actions={
            <>
              <HelpTooltip
                trigger={
                  <InfoIcon className="size-4 text-fg-tertiary hover:text-fg" />
                }
              >
                Add-on cost is added on top of all your current costs.
                Stackable.
              </HelpTooltip>
              {isLoading ? (
                <div className="flex items-center gap-2 px-3">
                  <Loader variant="slash" size="sm" />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  onClick={onAdd}
                  disabled={disabled}
                >
                  Buy Add-on
                </Button>
              )}
            </>
          }
        />
      </div>
    </div>
  )
}

function AddonItemSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="size-4 shrink-0" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 shrink-0 sm:ml-auto" />
    </div>
  )
}

function AddonsLoading() {
  return (
    <div className="flex flex-col">
      <Label className="prose-label text-fg-tertiary">Add-ons</Label>
      <div>
        <AddonItemSkeleton />
      </div>
    </div>
  )
}

function AddonsUpgradePlaceholder() {
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/billing/plan'>()

  return (
    <div className="flex flex-col">
      <Label className="prose-label text-fg-tertiary mb-2">Add-ons</Label>
      <div className="flex flex-col gap-3 py-3 border-y border-stroke sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="prose-body text-fg-tertiary">
          Upgrade to Pro to purchase add-ons for higher concurrency limits.
        </p>
        <Button variant="default" className="w-full sm:w-auto" asChild>
          <Link href={PROTECTED_URLS.BILLING_PLAN_SELECT(teamIdOrSlug)}>
            <UpgradeIcon className="size-4" />
            Upgrade to Pro
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function Addons() {
  const { team } = useDashboard()
  const { toast } = useToast()
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/billing/plan'>()
  const trpc = useTRPC()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { tierData, addonData, isLoading } = useBillingItems()
  const { teamLimits } = useTeamLimits()
  const currentConcurrentSandboxesLimit = teamLimits?.concurrentInstances ?? 0

  const selectedTierId = tierData?.selected?.id
  const currentAddon = addonData?.current
  const availableAddon = addonData?.available

  const isOnProTier = selectedTierId === TIER_PRO_ID

  const createOrderMutation = useMutation(
    trpc.billing.createOrder.mutationOptions({
      onSuccess: () => {
        setIsDialogOpen(true)
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message ?? 'Failed to create order'))
      },
    })
  )

  const handleAddAddon = () => {
    if (!team) return

    createOrderMutation.mutate({
      teamIdOrSlug,
      itemId: ADDON_500_SANDBOXES_ID,
    })
  }

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6">
        <AddonsLoading />
      </section>
    )
  }

  if (!isOnProTier) {
    return (
      <section className="flex flex-col gap-6">
        <AddonsUpgradePlaceholder />
      </section>
    )
  }

  const addonPriceCents =
    availableAddon?.price_cents ?? currentAddon?.price_cents
  const activeAddons =
    currentAddon && addonPriceCents
      ? formatAddonQuantity(currentAddon.quantity ?? 0, addonPriceCents)
      : []

  const hasActiveAddons = activeAddons.length > 0
  const orderData = createOrderMutation.data

  return (
    <section className="flex flex-col space-y-6">
      {hasActiveAddons && <ActiveAddons addons={activeAddons} />}

      {availableAddon && (
        <AvailableAddons
          addon={availableAddon}
          onAdd={handleAddAddon}
          isLoading={createOrderMutation.isPending}
          disabled={!team}
        />
      )}

      {orderData && availableAddon && (
        <ConcurrentSandboxAddOnPurchaseDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          orderId={orderData.id}
          monthlyPriceCents={availableAddon.price_cents}
          amountDueCents={orderData.amount_due}
          currentConcurrentSandboxesLimit={currentConcurrentSandboxesLimit}
        />
      )}
    </section>
  )
}
