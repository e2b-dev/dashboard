'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  memo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

type DashboardTabElement = ReactElement<DashboardTabProps, typeof DashboardTab>

export interface DashboardTabsProps {
  layoutKey: string
  type: 'query' | 'path'
  children: Array<DashboardTabElement> | DashboardTabElement
  className?: string
}

// COMPONENT

function DashboardTabsComponent({
  layoutKey,
  type,
  children,
  className,
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

export const DashboardTabs = memo(DashboardTabsComponent, (prev, next) => {
  if (
    prev.layoutKey !== next.layoutKey ||
    prev.type !== next.type ||
    prev.className !== next.className
  ) {
    return false
  }

  const prevChildren = Array.isArray(prev.children)
    ? prev.children
    : [prev.children]
  const nextChildren = Array.isArray(next.children)
    ? next.children
    : [next.children]

  if (prevChildren.length !== nextChildren.length) return false

  return prevChildren.every((prevChild, index) => {
    const nextChild = nextChildren[index]
    if (!nextChild) return false
    return (
      prevChild.props.id === nextChild.props.id &&
      prevChild.props.label === nextChild.props.label &&
      prevChild.props.icon === nextChild.props.icon
    )
  })
})

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
