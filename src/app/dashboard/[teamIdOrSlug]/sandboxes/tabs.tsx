'use client'

import { getRouteById } from '@/configs/dashboard-routes'
import { DashboardTabs } from '@/ui/dashboard-tabs'
import micromatch from 'micromatch'
import { useParams, usePathname } from 'next/navigation'
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
  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()

  const isInspectRoute = micromatch.isMatch(pathname, '*/**/sandboxes/**/*')

  if (isInspectRoute) {
    return inspectContent
  }

  // get sandboxes route config with tabs
  const sandboxesRoute = getRouteById('sandboxes')
  if (!sandboxesRoute || !sandboxesRoute.tabs) {
    // fallback if config is missing
    return monitoringContent
  }

  const basePath = sandboxesRoute.path(teamIdOrSlug)

  // map parallel segments to content
  const tabContentMap: Record<string, ReactNode> = {
    '@monitoring': monitoringContent,
    '@list': listContent,
  }

  return (
    <DashboardTabs
      type="query"
      tabs={sandboxesRoute.tabs}
      basePath={basePath}
      layoutKey="tabs-indicator-sandboxes"
    >
      {tabContentMap}
    </DashboardTabs>
  )
}
