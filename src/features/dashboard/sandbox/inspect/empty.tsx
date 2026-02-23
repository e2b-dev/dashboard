'use client'

import DashboardEmptyFrame from '@/features/dashboard/common/empty-frame'
import type { ReactNode } from 'react'

interface SandboxInspectEmptyFrameProps {
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  className?: string
}

export default function SandboxInspectEmptyFrame({
  title,
  description,
  actions,
  className,
}: SandboxInspectEmptyFrameProps) {
  return (
    <DashboardEmptyFrame
      title={title}
      description={<p>{description}</p>}
      actions={actions}
      className={className}
      descriptionPlacement="content"
    />
  )
}
