'use client'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { memo, ReactElement, ReactNode, useCallback, useMemo } from 'react'

type DashboardTabElement = ReactElement<DashboardTabProps, typeof DashboardTab>

export interface DashboardTabsProps {
  layoutKey: string
  type: 'query' | 'path'
  children: Array<DashboardTabElement> | DashboardTabElement
  className?: string
  headerAccessory?: ReactNode
}

// COMPONENT

function DashboardTabsComponent({
  layoutKey,
  type,
  children,
  className,
  headerAccessory,
}: DashboardTabsProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const tabs = useMemo(() => {
    const tabChildren = Array.isArray(children) ? children : [children]
    return tabChildren.map((child) => ({
      id: child.props.id,
      label: child.props.label,
      icon: child.props.icon,
    }))
  }, [children])

  const basePath = useMemo(() => {
    if (type === 'query') return pathname
    return inferBasePathForPathTabs(pathname, tabs)
  }, [type, pathname, tabs])

  const hrefForId = useCallback(
    (id: string) => {
      return type === 'query' ? `${basePath}?tab=${id}` : `${basePath}/${id}`
    },
    [type, basePath]
  )

  const activeTabId = useMemo(() => {
    if (type === 'query') {
      const defaultTabId = tabs[0]?.id
      return searchParams.get('tab') || defaultTabId
    }
    return tabs.find((tab) => pathname.endsWith(tab.id))?.id || tabs[0]?.id
  }, [type, tabs, searchParams, pathname])

  const tabsWithHrefs = useMemo(
    () => tabs.map((tab) => ({ ...tab, href: hrefForId(tab.id) })),
    [tabs, hrefForId]
  )

  const tabTriggers = tabsWithHrefs.map((tab) => (
    <TabsTrigger
      key={tab.id}
      layoutkey={layoutKey}
      value={tab.id}
      className="w-fit flex-none"
      asChild
    >
      <Link href={tab.href} prefetch>
        {tab.icon}
        {tab.label}
      </Link>
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

      {children}
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

// HELPERS

/**
 * Infers the base path for path-based tabs by checking if the current
 * pathname ends with a tab ID. If it does, removes that segment to get the base.
 */
function inferBasePathForPathTabs(
  pathname: string,
  tabs: Array<{ id: string }>
): string {
  const pathSegments = pathname.split('/')
  const lastSegment = pathSegments[pathSegments.length - 1]

  // if last segment is a tab id, remove it to get base path
  const isTabSegment = tabs.some((tab) => tab.id === lastSegment)

  return isTabSegment ? pathSegments.slice(0, -1).join('/') : pathname
}
