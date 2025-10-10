'use client'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ReactElement, ReactNode, useMemo } from 'react'

type DashboardTabElement = ReactElement<DashboardTabProps, typeof DashboardTab>

export interface DashboardTabsProps {
  layoutKey: string
  type: 'query' | 'path'
  children: Array<DashboardTabElement> | DashboardTabElement
  className?: string
}

// COMPONENT

export function DashboardTabs({
  layoutKey,
  type,
  children,
  className,
}: DashboardTabsProps) {
  // ensure children is an array
  const tabChildren = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  )

  const searchParams = useSearchParams()
  const pathname = usePathname()

  // build tab models once
  const tabs = tabChildren.map((child) => ({
    id: child.props.id,
    label: child.props.label,
    icon: child.props.icon,
  }))

  // derive hrefs and active tab based on `type`
  let hrefForId = (id: string) => ''
  let activeTabId: string | undefined

  if (type === 'query') {
    const basePath = pathname
    hrefForId = (id: string) => `${basePath}?tab=${id}`
    const defaultTabId = tabs[0]?.id
    activeTabId = searchParams.get('tab') || defaultTabId
  } else {
    const basePath = inferBasePathForPathTabs(pathname, tabs)
    hrefForId = (id: string) => `${basePath}/${id}`
    activeTabId =
      tabs.find((tab) => pathname.endsWith(tab.id))?.id || tabs[0]?.id
  }

  const tabsWithHrefs = tabs.map((tab) => ({
    ...tab,
    href: hrefForId(tab.id),
  }))

  return (
    <Tabs
      value={activeTabId}
      className={cn('min-h-0 w-full flex-1 h-full', className)}
    >
      <TabsList className="bg-bg z-30 w-full justify-start">
        {tabsWithHrefs.map((tab) => (
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
        ))}
      </TabsList>

      {children}
    </Tabs>
  )
}

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
      className={cn(
        'flex-1 min-h-0 h-full w-full overflow-hidden',
        props.className
      )}
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
