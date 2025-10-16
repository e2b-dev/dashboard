'use client'

import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'
import micromatch from 'micromatch'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface SandboxesTabsProps {
  monitoringContent: ReactNode
  listContent: ReactNode
  inspectContent?: ReactNode
}

export default function SandboxesTabs({
  monitoringContent,
  listContent,
  inspectContent,
}: SandboxesTabsProps) {
  const pathname = usePathname()

  const isInspectRoute = micromatch.isMatch(
    pathname,
    '/dashboard/*/sandboxes/**/*'
  )

  if (isInspectRoute) {
    return inspectContent
  }

  return (
    <DashboardTabs
      type="query"
      layoutKey="tabs-indicator-sandboxes"
      className="mt-2 md:mt-3"
    >
      <DashboardTab
        id="monitoring"
        label="Monitoring"
        icon={<TrendIcon className="size-4" />}
      >
        {monitoringContent}
      </DashboardTab>
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        {listContent}
      </DashboardTab>
    </DashboardTabs>
  )
}
