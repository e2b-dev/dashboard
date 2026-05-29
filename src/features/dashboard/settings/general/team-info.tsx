'use client'

import { useDashboard } from '@/features/dashboard/context'
import { formatDate } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <span className="text-fg-tertiary shrink-0 text-xs leading-[17px] font-normal uppercase">
      {label}
    </span>
    <CopyButtonInline
      value={value}
      iconPosition="left"
      aria-label={`Copy ${label}`}
      className="text-fg-secondary text-sm leading-5 font-normal"
    >
      {value}
    </CopyButtonInline>
  </div>
)

export const TeamInfo = () => {
  const { team } = useDashboard()
  const createdAt = formatDate(new Date(team.createdAt), 'MMM d, yyyy') ?? '--'

  return (
    <div className="flex flex-col gap-1.5">
      <InfoRow label="created" value={createdAt} />
      <InfoRow label="primary email" value={team.email} />
      <InfoRow label="team id" value={team.id} />
    </div>
  )
}
