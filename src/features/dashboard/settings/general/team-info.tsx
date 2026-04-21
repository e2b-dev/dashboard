'use client'

import { useDashboard } from '@/features/dashboard/context'
import { formatDate } from '@/lib/utils/formatting'

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-fg-tertiary text-xs leading-[17px] font-normal uppercase">
      {label}
    </span>
    <span className="text-fg-secondary font-mono text-base leading-5 font-semibold tracking-[-0.16px] uppercase">
      {value}
    </span>
  </div>
)

export const TeamInfo = () => {
  const { team } = useDashboard()
  const createdAt = formatDate(new Date(team.createdAt), 'MMM d, yyyy') ?? '--'

  return (
    <div className="flex flex-col gap-1.5">
      <InfoRow label="created" value={createdAt} />
      <InfoRow label="primary email" value={team.email} />
    </div>
  )
}
