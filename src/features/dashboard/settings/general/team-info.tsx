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

interface TeamInfoProps {
  createdAt?: string | null
}

// "jan 1, 2025" — e.g. formatDate("2025-01-01T00:00:00Z") → "jan 1, 2025"
const formatDate = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const TeamInfo = ({ createdAt }: TeamInfoProps) => {
  const { team } = useDashboard()
  const resolvedCreatedAt = createdAt ?? team.createdAt

  return (
    <div className="flex flex-col gap-3">
      {resolvedCreatedAt && (
        <InfoRow label="created" value={formatDate(resolvedCreatedAt)} />
      )}
      <InfoRow label="primary email" value={team.email} />
    </div>
  )
}
