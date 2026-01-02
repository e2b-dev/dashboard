'use client'

import { TierLimits } from '@/types/billing.types'
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

  return (
    <div className="size-36 min-w-36 relative flex items-center justify-center max-lg:hidden text-icon-tertiary">
      {!isLoading && icon}
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

  return (
    <div className="flex flex-col pt-2 pr-2 pb-1 w-full">
      <div className="flex items-start justify-between gap-4 max-lg:flex-col">
        <PlanTitle selectedTier={selectedTier} isLoading={isLoading} />

        <div className="flex items-center gap-2 flex-wrap">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-8 w-36" />
            </>
          ) : isBaseTier ? (
            <Button variant="default">
              <UpgradeIcon className="size-4" />
              Upgrade for higher concurrency
            </Button>
          ) : (
            <Button variant="outline">Manage plan & add-ons</Button>
          )}
          {!isLoading && <Button variant="outline">Manage payment</Button>}
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
        <h2 className="text-3xl font-bold tracking-tight">
          {selectedTier?.name}
        </h2>
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
