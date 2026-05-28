'use client'

import { usePathname, useRouter } from 'next/navigation'
import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/primitives/select'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

export interface DashboardTabItem {
  id: string
  label: string
  href: string
  icon?: ReactNode
}

export interface DashboardTabsListProps {
  layoutKey: string
  tabs: DashboardTabItem[]
  className?: string
  headerAccessory?: ReactNode
  /**
   * Controls how the tab bar renders on mobile (`max-md`) viewports.
   * - `tabs` (default): horizontal `TabsList`, identical to desktop.
   * - `select`: replaces the tab list with a `Select` dropdown and renders
   *   the optional `headerAccessory` inline on the same row.
   *
   * Desktop rendering is unchanged regardless of variant.
   */
  mobileVariant?: 'tabs' | 'select'
}

function DashboardTabsListComponent({
  layoutKey,
  tabs,
  className,
  headerAccessory,
  mobileVariant = 'tabs',
}: DashboardTabsListProps) {
  const pathname = usePathname()
  const router = useRouter()

  const firstTab = tabs[0]
  if (!firstTab) {
    return null
  }

  const activeTab =
    tabs.find((tab) => isTabActive(pathname, tab.href)) ?? firstTab
  const activeTabId = activeTab.id

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

  if (mobileVariant === 'select') {
    const handleSelectChange = (id: string) => {
      const next = tabs.find((tab) => tab.id === id)
      if (next) router.push(next.href)
    }

    return (
      <Tabs
        value={activeTabId}
        className={cn(
          'bg-bg flex w-full flex-none flex-row items-end',
          className
        )}
      >
        <Select value={activeTabId} onValueChange={handleSelectChange}>
          <SelectTrigger className="h-9 w-fit border-x-0 border-t-0 border-b border-solid md:hidden">
            <div className="flex items-center gap-2">
              {activeTab.icon}
              {activeTab.label}
            </div>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                <span className="inline-flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <TabsList className="bg-bg justify-start max-md:hidden md:flex-1">
          {tabTriggers}
        </TabsList>

        {headerAccessory && (
          <div className="flex items-end border-b border-solid max-md:flex-1 max-md:justify-end md:px-6">
            {headerAccessory}
          </div>
        )}
      </Tabs>
    )
  }

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
