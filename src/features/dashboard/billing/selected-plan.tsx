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

interface SelectedPlanProps {
  tierData: BillingTierData
  addonData: BillingAddonData
}

export default function SelectedPlan({
  tierData,
  addonData,
}: SelectedPlanProps) {
  return (
    <section className="flex gap-5 p-3">
      <PlanAvatar selectedTier={tierData.selected} />
      <PlanDetails selectedTier={tierData.selected} addonData={addonData} />
    </section>
  )
}

interface PlanAvatarProps {
  selectedTier: BillingTierData['selected']
}

function PlanAvatar({ selectedTier }: PlanAvatarProps) {
  const isBaseTier = !selectedTier || selectedTier.id.includes('base')

  const icon = isBaseTier ? (
    <BuildIcon className="size-7" />
  ) : (
    <UpgradeIcon className="size-7" />
  )

  return (
    <div className="size-36 min-w-36 relative flex items-center justify-center max-lg:hidden text-icon-tertiary">
      {icon}
      <TierAvatarBorder className="absolute inset-0 dark:text-white text-black" />
    </div>
  )
}

interface PlanTitleProps {
  selectedTier: BillingTierData['selected']
}

function PlanTitle({ selectedTier }: PlanTitleProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-fg-tertiary">Plan</Label>
      <h2 className="text-3xl font-bold tracking-tight">
        {selectedTier?.name}
      </h2>
    </div>
  )
}

interface PlanDetailsProps {
  selectedTier: BillingTierData['selected']
  addonData: BillingAddonData
}

function PlanDetails({ selectedTier, addonData }: PlanDetailsProps) {
  const isBaseTier = !selectedTier || selectedTier.id.includes('base')

  return (
    <div className="flex flex-col pt-2 pr-2 pb-1 w-full">
      <div className="flex items-start justify-between gap-4 max-lg:flex-col">
        <PlanTitle selectedTier={selectedTier} />

        <div className="flex items-center gap-2 flex-wrap">
          {isBaseTier ? (
            <Button variant="default">
              <UpgradeIcon className="size-4" />
              Upgrade for higher concurrency
            </Button>
          ) : (
            <Button variant="outline">Manage plan & add-ons</Button>
          )}
          <Button variant="outline">Manage payment</Button>
        </div>
      </div>

      <Separator className="my-4" />

      <PlanFeatures limits={selectedTier?.limits} addonData={addonData} />
    </div>
  )
}

interface PlanFeaturesProps {
  limits: TierLimits | undefined
  addonData: BillingAddonData
}

function PlanFeatures({ limits, addonData }: PlanFeaturesProps) {
  if (!limits) return null

  const addonSandboxes =
    (addonData.current?.quantity ?? 0) * SANDBOXES_PER_ADDON
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
          className="flex items-center gap-2 text-fg-tertiary"
        >
          {feature.icon}
          <span className="text-sm">{feature.label}</span>
        </div>
      ))}
    </div>
  )
}
