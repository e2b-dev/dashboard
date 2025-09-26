'use client'

import { DashboardTabs } from '@/ui/dashboard-tabs'
import { ReactNode } from 'react'
import SandboxInspectIncompatible from './inspect/incompatible'

interface SandboxDetailsTabsProps {
  tabs: string[]
  children: ReactNode
  isEnvdVersionIncompatibleForInspect: boolean
  templateNameOrId: string
  teamIdOrSlug: string
  sandboxId: string
}

export default function SandboxDetailsTabs({
  tabs,
  children,
  isEnvdVersionIncompatibleForInspect,
  templateNameOrId,
  teamIdOrSlug,
  sandboxId,
}: SandboxDetailsTabsProps) {
  // transform string tabs into structured format
  const structuredTabs = tabs.map((tab) => ({
    id: tab,
    label: tab.charAt(0).toUpperCase() + tab.slice(1),
    href: `/dashboard/${teamIdOrSlug}/sandboxes/${sandboxId}${tab === tabs[0] ? '' : `/${tab}`}`,
  }))

  // handle incompatible inspect tab
  const tabContent: Record<string, ReactNode> = {}
  tabs.forEach((tab) => {
    if (tab === 'inspect' && isEnvdVersionIncompatibleForInspect) {
      tabContent[tab] = (
        <SandboxInspectIncompatible
          templateNameOrId={templateNameOrId}
          teamIdOrSlug={teamIdOrSlug}
        />
      )
    } else {
      tabContent[tab] = children
    }
  })

  return (
    <DashboardTabs
      type="path"
      tabs={structuredTabs}
      layoutKey="tabs-indicator-sandbox"
    >
      {tabContent}
    </DashboardTabs>
  )
}
