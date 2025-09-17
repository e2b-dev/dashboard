'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { ActivityIcon, LayoutListIcon, LucideIcon } from 'lucide-react'
import micromatch from 'micromatch'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { ReactNode } from 'react'

type TabValue = 'monitoring' | 'list'

interface TabConfig {
  value: TabValue
  icon: LucideIcon
  label: string
  url: (teamIdOrSlug: string) => string
}

const TABS: TabConfig[] = [
  {
    value: 'monitoring',
    icon: ActivityIcon,
    label: 'Monitoring',
    url: (teamIdOrSlug: string) =>
      PROTECTED_URLS.SANDBOXES(teamIdOrSlug, 'monitoring'),
  },
  {
    value: 'list',
    icon: LayoutListIcon,
    label: 'List',
    url: (teamIdOrSlug: string) =>
      PROTECTED_URLS.SANDBOXES(teamIdOrSlug, 'list'),
  },
]

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
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') || TABS[0]?.value

  const pathname = usePathname()
  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()

  const activeTab = TABS.find((tab) => tab.value === urlTab)

  const isInspectRoute = micromatch.isMatch(pathname, '*/**/sandboxes/**/*')

  if (isInspectRoute) {
    return inspectContent
  }

  const tabContentMap: Record<TabValue, ReactNode> = {
    monitoring: monitoringContent,
    list: listContent,
  }

  return (
    <Tabs
      value={activeTab?.value}
      className="min-h-0 w-full flex-1 pt-3.5 h-full"
    >
      <TabsList className="bg-bg z-30 w-full justify-start pl-6">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            layoutkey="tabs-indicator-sandboxes"
            value={tab.value}
            className="w-fit flex-none"
            asChild
          >
            <Link href={tab.url(teamIdOrSlug)} prefetch>
              <tab.icon className="size-3.5" />
              {tab.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={cn('flex flex-1 flex-col overflow-hidden')}
        >
          {tabContentMap[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
