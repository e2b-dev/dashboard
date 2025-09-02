'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { ActivityIcon, LayoutListIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ReactNode } from 'react'

const TABS = [
  {
    value: 'monitoring',
    icon: ActivityIcon,
    url: (teamIdOrSlug: string) =>
      PROTECTED_URLS.SANDBOXES_MONITORING(teamIdOrSlug),
  },
  {
    value: 'list',
    icon: LayoutListIcon,
    url: (teamIdOrSlug: string) => PROTECTED_URLS.SANDBOXES_LIST(teamIdOrSlug),
  },
]

interface SandboxesTabsProps {
  children: ReactNode
}

export default function SandboxesTabs({ children }: SandboxesTabsProps) {
  const pathname = usePathname()
  const urlTab = pathname.split('/').pop() || TABS[0]?.value

  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()

  const activeTab = TABS.find((tab) => tab.value === urlTab)

  return (
    <Tabs
      value={activeTab?.value}
      onValueChange={(value) => {
        const newTab = TABS.find((tab) => tab.value === value)

        if (newTab?.value === activeTab?.value) return
      }}
      className="min-h-0 w-full flex-1 pt-3.5 h-full"
    >
      <TabsList className="bg-bg z-30 w-full justify-start pl-6">
        {TABS.map((tab) => (
          <Link key={tab.value} href={tab.url(teamIdOrSlug)} prefetch>
            <TabsTrigger value={tab.value} className="w-fit flex-none">
              <tab.icon className="size-3.5" />
              {tab.value.charAt(0).toUpperCase() + tab.value.slice(1)}
            </TabsTrigger>
          </Link>
        ))}
      </TabsList>
      {TABS.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={cn('flex flex-1 flex-col md:overflow-hidden')}
        >
          {children}
        </TabsContent>
      ))}
    </Tabs>
  )
}
