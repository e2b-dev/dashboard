'use client'

import { useRouteParams } from '@/lib/hooks/use-route-params'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { TierInfo } from '@/types/billing.types'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  BuildIcon,
  GaugeIcon,
  SandboxIcon,
  SupportIcon,
  TimeIcon,
  UpgradeIcon,
} from '@/ui/primitives/icons'
import { Separator } from '@/ui/primitives/separator'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useDashboard } from '../context'
import { TIER_BASE_ID, TIER_PRO_ID } from './constants'
import { useBillingItems } from './hooks'
import { TierAvatarBorder } from './tier-avatar-border'
import { formatHours, formatMibToGb } from './utils'

interface PlanFeature {
  icon: React.ReactNode
  label: React.ReactNode
}

function getHobbyFeatures(tier?: TierInfo): PlanFeature[] {
  const limits = tier?.limits
  if (!limits) return []

  return [
    {
      icon: <SandboxIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">{limits.sandbox_concurrency}</span>{' '}
          concurrent sandboxes
        </>
      ),
    },
    {
      icon: <TimeIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">
            {formatHours(limits.max_sandbox_duration_hours)}
          </span>{' '}
          session length
        </>
      ),
    },
    {
      icon: <GaugeIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">{formatMibToGb(limits.disk_size_mib)}</span>{' '}
          disk per sandbox
        </>
      ),
    },
    {
      icon: <SupportIcon className="size-4" />,
      label: 'Community support',
    },
  ]
}

function getProFeatures(tier?: TierInfo): PlanFeature[] {
  const limits = tier?.limits
  if (!limits) return []

  return [
    {
      icon: <SandboxIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">{limits.sandbox_concurrency}</span>{' '}
          concurrent sandboxes
        </>
      ),
    },
    {
      icon: <TimeIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">
            {formatHours(limits.max_sandbox_duration_hours)}
          </span>{' '}
          session length
        </>
      ),
    },
    {
      icon: <SandboxIcon className="size-4" />,
      label: 'Add-on support',
    },
    {
      icon: <GaugeIcon className="size-4" />,
      label: (
        <>
          <span className="text-fg">{formatMibToGb(limits.disk_size_mib)}</span>{' '}
          disk per sandbox
        </>
      ),
    },
  ]
}

interface PlanCardProps {
  tier?: TierInfo
  isCurrentPlan: boolean
  isBaseTier: boolean
  features: PlanFeature[]
  isLoading?: boolean
  onSelectPlan: () => void
  isSelectingPlan: boolean
}

function PlanCardSkeleton() {
  return (
    <div className="flex gap-5">
      <Skeleton className="size-36 min-w-36 shrink-0 max-md:hidden" />
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Separator />
        <div className="flex gap-x-4 gap-y-2 flex-wrap max-w-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  tier,
  isCurrentPlan,
  isBaseTier,
  features,
  isLoading,
  onSelectPlan,
  isSelectingPlan,
}: PlanCardProps) {
  const { team } = useDashboard()

  if (isLoading) {
    return <PlanCardSkeleton />
  }

  const icon = isBaseTier ? (
    <BuildIcon className="size-7" />
  ) : (
    <UpgradeIcon className="size-7" />
  )

  const displayName = isBaseTier ? 'Hobby' : 'Professional'
  const priceDisplay = tier?.price_cents
    ? formatCurrency(tier.price_cents / 100)
    : 'FREE'

  const teamDisplayName = team.transformed_default_name || team.name

  const buttonVariant = isBaseTier ? 'outline' : 'default'
  const buttonText = isBaseTier ? 'Downgrade' : 'Upgrade'

  return (
    <div className="flex gap-5">
      <div className="size-36 min-w-36 relative flex items-center justify-center max-md:hidden text-icon-tertiary shrink-0">
        {icon}
        <TierAvatarBorder className="absolute inset-0 dark:text-white text-black" />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="prose-label text-fg-tertiary uppercase">
              {displayName}
            </span>
            <span className="prose-value-big text-fg">{priceDisplay}</span>
          </div>

          {isCurrentPlan ? (
            <Badge variant="default" className="h-8 px-3">
              Your current plan
            </Badge>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="prose-body text-fg-tertiary">
                Changes apply to:{' '}
                <span className="text-fg">{teamDisplayName}</span>
              </span>
              <Button
                variant={buttonVariant}
                onClick={onSelectPlan}
                loading={isSelectingPlan}
                disabled={isSelectingPlan}
              >
                <UpgradeIcon className="size-4" />
                {buttonText}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex gap-x-4 gap-y-2 flex-wrap max-w-100">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 text-fg-tertiary"
            >
              {feature.icon}
              <span className="prose-body">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SelectPlan() {
  const { toast } = useToast()
  const { tierData, isLoading } = useBillingItems()
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/billing/plan/select'>()
  const router = useRouter()
  const trpc = useTRPC()

  const { mutate: createCheckout, isPending: isCheckoutLoading } = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        router.push(data.url)
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message ?? 'Failed to redirect to checkout')
        )
      },
    })
  )

  const { mutate: openCustomerPortal, isPending: isPortalLoading } =
    useMutation(
      trpc.billing.createCustomerPortalSession.mutationOptions({
        onSuccess: (data) => {
          router.push(data.url)
        },
        onError: (error) => {
          toast(
            defaultErrorToast(error.message ?? 'Failed to open customer portal')
          )
        },
      })
    )

  const handleUpgrade = (tierId: string) => {
    createCheckout({ teamIdOrSlug, tierId })
  }

  const handleDowngrade = () => {
    openCustomerPortal({ teamIdOrSlug })
  }

  const baseTier = tierData?.base
  const proTier = tierData?.pro
  const selectedTierId = tierData?.selected?.id

  const isOnBaseTier = selectedTierId === TIER_BASE_ID
  const isOnProTier = selectedTierId === TIER_PRO_ID

  const hobbyFeatures = getHobbyFeatures(baseTier)
  const proFeatures = getProFeatures(proTier)

  return (
    <section className="flex flex-col gap-10">
      <PlanCard
        tier={baseTier}
        isCurrentPlan={isOnBaseTier}
        isBaseTier={true}
        features={hobbyFeatures}
        isLoading={isLoading}
        onSelectPlan={handleDowngrade}
        isSelectingPlan={isPortalLoading}
      />
      <PlanCard
        tier={proTier}
        isCurrentPlan={isOnProTier}
        isBaseTier={false}
        features={proFeatures}
        isLoading={isLoading}
        onSelectPlan={() => proTier?.id && handleUpgrade(proTier.id)}
        isSelectingPlan={isCheckoutLoading}
      />
    </section>
  )
}
