'use client'

import { RouteTab } from '@/configs/dashboard-routes'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode } from 'react'

// query param based tabs (for dashboard routes with parallel segments)
interface QueryParamTabsProps {
  type: 'query'
  tabs: RouteTab[]
  basePath: string
  children: Record<string, ReactNode> // keyed by tab parallelSegment
  className?: string
  layoutKey?: string
}

// path based tabs (for detail pages like sandbox inspect)
interface PathBasedTabsProps {
  type: 'path'
  tabs: Array<{
    id: string
    label: string
    icon?: LucideIcon
    href: string
  }>
  children: Record<string, ReactNode> // keyed by tab id
  className?: string
  layoutKey?: string
}

export type DashboardTabsProps = QueryParamTabsProps | PathBasedTabsProps

export function DashboardTabs(props: DashboardTabsProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  if (props.type === 'query') {
    const {
      tabs,
      basePath,
      children,
      className,
      layoutKey = 'tabs-indicator',
    } = props
    const defaultTab = tabs.find((t) => t.isDefault)
    const activeTabId = searchParams.get('tab') || defaultTab?.id || tabs[0]?.id

    return (
      <Tabs
        value={activeTabId}
        className={cn('min-h-0 w-full flex-1 pt-3.5 h-full', className)}
      >
        <TabsList className="bg-bg z-30 w-full justify-start pl-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              layoutkey={layoutKey}
              value={tab.id}
              className="w-fit flex-none"
              asChild
            >
              <Link href={`${basePath}?tab=${tab.id}`} prefetch>
                {tab.icon && <tab.icon className="size-3.5" />}
                {tab.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {children[tab.parallelSegment]}
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  // path based tabs
  const { tabs, children, className, layoutKey = 'tabs-indicator' } = props
  const activeTabId =
    tabs.find((tab) => pathname.endsWith(tab.id))?.id || tabs[0]?.id

  return (
    <Tabs
      value={activeTabId}
      className={cn('min-h-0 w-full flex-1', className)}
    >
      <TabsList className="bg-bg z-30 w-full justify-start pl-3 md:pl-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            layoutkey={layoutKey}
            value={tab.id}
            className="w-fit flex-none"
            asChild
          >
            <Link href={tab.href} prefetch>
              {tab.icon && <tab.icon className="size-3.5" />}
              {tab.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className={cn('flex flex-1 flex-col md:overflow-hidden')}
        >
          {children[tab.id]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
