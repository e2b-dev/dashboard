'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { TierLimits } from '@/types/billing.types'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  BuildIcon,
  CpuIcon,
  GaugeIcon,
  MemoryIcon,
  SandboxIcon,
  TimeIcon,
  UpgradeIcon,
} from '@/ui/primitives/icons'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useBillingItems } from './hooks'
import { TierAvatarBorder } from './tier-avatar-border'
import { BillingAddonData, BillingTierData } from './types'

const MIB_TO_GB = 1024
const SANDBOXES_PER_ADDON = 500

function formatMibToGb(mib: number): string {
  const gb = Math.round(mib / MIB_TO_GB)
  return `${gb}GB`
}

function formatHours(hours: number): string {
  return `${hours}h`
}

function formatCpu(vcpu: number): string {
  return `${vcpu} vCPU`
}

export default function SelectedPlan() {
  const { tierData, addonData, isLoading } = useBillingItems()

  return (
    <section className="flex gap-5">
      <PlanAvatar selectedTier={tierData?.selected} isLoading={isLoading} />
      <PlanDetails
        selectedTier={tierData?.selected}
        addonData={addonData}
        isLoading={isLoading}
      />
    </section>
  )
}

interface PlanAvatarProps {
  selectedTier: BillingTierData['selected']
  isLoading: boolean
}

function PlanAvatar({ selectedTier, isLoading }: PlanAvatarProps) {
  const isBaseTier = !selectedTier || selectedTier.id.includes('base')

  const icon = isBaseTier ? (
    <BuildIcon className="size-7" />
  ) : (
    <UpgradeIcon className="size-7" />
  )

  if (isLoading) {
    return <Skeleton className="size-36 min-w-36 max-lg:hidden" />
  }

  return (
    <div className="size-36 min-w-36 relative flex items-center justify-center max-lg:hidden text-icon-tertiary">
      {icon}
      <TierAvatarBorder className="absolute inset-0 dark:text-white text-black" />
    </div>
  )
}

interface PlanDetailsProps {
  selectedTier: BillingTierData['selected']
  addonData: BillingAddonData | undefined
  isLoading: boolean
}

function PlanDetails({ selectedTier, addonData, isLoading }: PlanDetailsProps) {
  const isBaseTier = !selectedTier || selectedTier.id.includes('base')
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/billing'>['params']>
    >()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const trpc = useTRPC()
  const isOnPlanPage = pathname.endsWith('/plan')

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

  const handleManagePayment = () => {
    openCustomerPortal({ teamIdOrSlug })
  }

  return (
    <div className="flex flex-col pt-2 pr-2 pb-1 w-full">
      <div className="flex items-start justify-between gap-4 max-lg:flex-col">
        <PlanTitle selectedTier={selectedTier} isLoading={isLoading} />

        <div className="flex items-center gap-2 flex-wrap">
          {isOnPlanPage ? (
            <Link
              href={PROTECTED_URLS.BILLING_PLAN_SELECT(teamIdOrSlug)}
              passHref
            >
              <Button variant="outline">Change Plan</Button>
            </Link>
          ) : isLoading ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <>
              {isBaseTier ? (
                <Link
                  href={PROTECTED_URLS.BILLING_PLAN_SELECT(teamIdOrSlug)}
                  passHref
                >
                  <Button variant="default">
                    <UpgradeIcon className="size-4" />
                    Upgrade for higher concurrency
                  </Button>
                </Link>
              ) : (
                <Link href={PROTECTED_URLS.BILLING_PLAN(teamIdOrSlug)} passHref>
                  <Button variant="outline">Manage plan & add-ons</Button>
                </Link>
              )}
              <Button
                variant="outline"
                onClick={handleManagePayment}
                loading={isPortalLoading}
                disabled={isPortalLoading}
              >
                Manage payment
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      <PlanFeatures
        limits={selectedTier?.limits}
        addonData={addonData}
        isLoading={isLoading}
      />
    </div>
  )
}

interface PlanTitleProps {
  selectedTier: BillingTierData['selected']
  isLoading: boolean
}

function PlanTitle({ selectedTier, isLoading }: PlanTitleProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-fg-tertiary prose-label">Plan</Label>
      {isLoading ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <div className="flex gap-3">
          <span className="prose-value-big uppercase text-fg">
            {selectedTier?.name}
          </span>
          <Badge className="uppercase translate-y-1">
            {selectedTier?.price_cents
              ? `${formatCurrency(selectedTier.price_cents / 100)}/mo`
              : 'FREE'}
          </Badge>
        </div>
      )}
    </div>
  )
}

interface PlanFeaturesProps {
  limits: TierLimits | undefined
  addonData: BillingAddonData | undefined
  isLoading: boolean
}

function PlanFeatures({ limits, addonData, isLoading }: PlanFeaturesProps) {
  if (isLoading) {
    return (
      <div className="flex gap-x-3 gap-y-3 flex-wrap max-w-120">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4" style={{ width: `${2 + i * 4}rem` }} />
          </div>
        ))}
      </div>
    )
  }

  if (!limits) return null

  const addonSandboxes =
    (addonData?.current?.quantity ?? 0) * SANDBOXES_PER_ADDON
  const totalConcurrentSandboxes = limits.sandbox_concurrency + addonSandboxes

  const features = [
    {
      icon: <SandboxIcon className="size-4" />,
      label: `${totalConcurrentSandboxes} concurrent sandboxes`,
    },
    {
      icon: <TimeIcon className="size-4" />,
      label: `${formatHours(limits.max_sandbox_duration_hours)} session length`,
    },
    {
      icon: <GaugeIcon className="size-4" />,
      label: `${formatMibToGb(limits.disk_size_mib)} disk per sandbox`,
    },
    {
      icon: <CpuIcon className="size-4" />,
      label: `${formatCpu(limits.max_cpu)} max`,
    },
    {
      icon: <MemoryIcon className="size-4" />,
      label: `${formatMibToGb(limits.max_ram_mib)} RAM max`,
    },
  ]

  return (
    <div className="flex gap-x-3 gap-y-1 flex-wrap max-w-100">
      {features.map((feature) => (
        <div
          key={feature.label}
          className="flex items-center gap-1 text-fg-tertiary"
        >
          {feature.icon}
          <span className="text-sm">{feature.label}</span>
        </div>
      ))}
    </div>
  )
}
