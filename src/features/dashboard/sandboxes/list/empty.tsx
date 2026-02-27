import type { ReactNode } from 'react'
import DashboardEmptyFrame from '@/features/dashboard/common/empty-frame'

interface SandboxesListEmptyProps {
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  className?: string
}

export default function SandboxesListEmpty({
  title,
  description,
  actions,
  className,
}: SandboxesListEmptyProps) {
  return (
    <DashboardEmptyFrame
      title={title}
      description={description}
      actions={actions}
      className={className}
      descriptionPlacement="header"
    />
  )
}
