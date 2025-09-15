'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { ActivityIcon, LayoutListIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { ReactNode } from 'react'

const TABS = [
  {
    value: 'monitoring',
    icon: ActivityIcon,
    url: (teamIdOrSlug: string) =>
      PROTECTED_URLS.SANDBOXES(teamIdOrSlug, 'monitoring'),
  },
  {
    value: 'list',
    icon: LayoutListIcon,
    url: (teamIdOrSlug: string) =>
      PROTECTED_URLS.SANDBOXES(teamIdOrSlug, 'list'),
  },
]

interface SandboxesTabsProps {
  children: ReactNode[]
}

export default function SandboxesTabs({ children }: SandboxesTabsProps) {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') || TABS[0]?.value

  const pathname = usePathname()

  const { teamIdOrSlug } = useParams<{ teamIdOrSlug: string }>()

  const activeTab = TABS.find((tab) => tab.value === urlTab)

  if (pathname.includes('/sandboxes/')) {
    return children[children.length - 1]
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
              {tab.value.charAt(0).toUpperCase() + tab.value.slice(1)}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab, ix) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={cn('flex flex-1 flex-col overflow-hidden')}
        >
          {children?.[ix]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
