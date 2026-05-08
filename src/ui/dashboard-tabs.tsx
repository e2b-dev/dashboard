'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import {
  Children,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

type DashboardTabElement = ReactElement<DashboardTabProps, typeof DashboardTab>

export interface DashboardTabsProps {
  layoutKey: string
  type: 'query' | 'path'
  children: ReactNode
  className?: string
  headerAccessory?: ReactNode
}

function DashboardTabsComponent({
  layoutKey,
  type,
  children,
  className,
  headerAccessory,
}: DashboardTabsProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const tabs = Children.toArray(children)
    .filter(isDashboardTabElement)
    .map((child) => ({
      id: child.props.id,
      label: child.props.label,
      icon: child.props.icon,
      content: child,
    }))

  const firstTab = tabs[0]
  if (!firstTab) {
    return null
  }

  const defaultTabId = firstTab.id
  const tabIds = new Set(tabs.map((tab) => tab.id))
  const requestedTabId =
    type === 'query' ? searchParams.get('tab') : pathname.split('/').pop()
  const activeTabId =
    requestedTabId && tabIds.has(requestedTabId) ? requestedTabId : defaultTabId
  const basePath =
    type === 'query' ? pathname : trimActiveTabSegment(pathname, tabIds)

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId)?.content ?? firstTab.content

  const tabTriggers = tabs.map((tab) => (
    <TabsTrigger
      key={tab.id}
      layoutkey={layoutKey}
      value={tab.id}
      className="w-fit flex-none"
      asChild
    >
      <HoverPrefetchLink
        href={getTabHref(tab.id, type, basePath, searchParams)}
      >
        {tab.icon}
        {tab.label}
      </HoverPrefetchLink>
    </TabsTrigger>
  ))

  return (
    <Tabs
      value={activeTabId}
      className={cn('min-h-0 w-full flex-1 h-full', className)}
    >
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

      {activeTab}
    </Tabs>
  )
}

export const DashboardTabs = memo(DashboardTabsComponent)

export interface DashboardTabProps {
  id: string
  label: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export function DashboardTab(props: DashboardTabProps) {
  return (
    <TabsContent
      value={props.id}
      className={cn('flex-1 min-h-0 w-full overflow-hidden', props.className)}
    >
      {props.children}
    </TabsContent>
  )
}

function isDashboardTabElement(child: ReactNode): child is DashboardTabElement {
  if (!isValidElement(child)) {
    return false
  }

  const props = child.props as Partial<DashboardTabProps> | null

  return Boolean(
    props && typeof props.id === 'string' && typeof props.label === 'string'
  )
}

function trimActiveTabSegment(pathname: string, tabIds: Set<string>): string {
  const pathSegments = pathname.split('/')
  const lastSegment = pathSegments[pathSegments.length - 1] ?? ''
  if (!tabIds.has(lastSegment)) {
    return pathname
  }

  const basePath = pathSegments.slice(0, -1).join('/')
  return basePath || '/'
}

function getTabHref(
  id: string,
  type: DashboardTabsProps['type'],
  basePath: string,
  searchParams: ReturnType<typeof useSearchParams>
): string {
  if (type === 'path') {
    return `${basePath}/${id}`
  }

  const nextSearchParams = new URLSearchParams(searchParams.toString())
  nextSearchParams.set('tab', id)
  const query = nextSearchParams.toString()

  return query ? `${basePath}?${query}` : basePath
}
