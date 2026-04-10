'use client'

import { useDashboard } from '@/features/dashboard/context'

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase">
      {label}
    </span>
    <span className="text-fg-secondary font-mono text-base leading-5 font-semibold tracking-[-0.16px]">
      {value}
    </span>
  </div>
)

export const TeamInfo = () => {
  const { team } = useDashboard()

  return (
    <div className="flex flex-col gap-3">
      <InfoRow label="created" value="--" />
      <InfoRow label="primary email" value={team.email} />
    </div>
  )
}
