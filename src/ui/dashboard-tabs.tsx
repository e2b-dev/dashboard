'use client'

import { usePathname } from 'next/navigation'
import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

export interface DashboardTabsListProps {
  layoutKey: string
  tabs: DashboardTabItem[]
  className?: string
  headerAccessory?: ReactNode
}

export interface DashboardTabItem {
  id: string
  label: string
  href: string
  icon?: ReactNode
}

function DashboardTabsListComponent({
  layoutKey,
  tabs,
  className,
  headerAccessory,
}: DashboardTabsListProps) {
  const pathname = usePathname()

  const firstTab = tabs[0]
  if (!firstTab) {
    return null
  }

  const activeTabId =
    tabs.find((tab) => isTabActive(pathname, tab.href))?.id ?? firstTab.id

  const tabTriggers = tabs.map((tab) => (
    <TabsTrigger
      key={tab.id}
      layoutkey={layoutKey}
      value={tab.id}
      className="w-fit flex-none"
      asChild
    >
      <HoverPrefetchLink href={tab.href}>
        {tab.icon}
        {tab.label}
      </HoverPrefetchLink>
    </TabsTrigger>
  ))

  return (
    <Tabs value={activeTabId} className={cn('w-full flex-none', className)}>
      {headerAccessory ? (
        <div className="bg-bg z-30 flex w-full flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-0">
          <div className="order-1 px-3 md:order-2 md:border-b md:px-6 md:flex md:items-end">
            {headerAccessory}
          </div>
          <TabsList className="bg-bg order-2 w-full justify-start md:order-1 md:flex-1 md:w-full">
            {tabTriggers}
          </TabsList>
        </div>
      ) : (
        <TabsList className="bg-bg z-30 w-full justify-start">
          {tabTriggers}
        </TabsList>
      )}
    </Tabs>
  )
}

export const DashboardTabsList = memo(DashboardTabsListComponent)

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
