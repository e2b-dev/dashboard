'use client'

import { getGroupedRoutes } from '@/configs/dashboard-routes'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { cn } from '@/lib/utils'
import micromatch from 'micromatch'
import Link from 'next/link'
import { useMemo } from 'react'

import { useIsMobile } from '@/lib/hooks/use-mobile'
import {
  SIDEBAR_TRANSITION_CLASSNAMES,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/ui/primitives/sidebar'
import { usePathname } from 'next/navigation'

export default function DashboardSidebarContent() {
  const selectedTeam = useSelectedTeam()
  const selectedTeamIdentifier = selectedTeam?.slug ?? selectedTeam?.id
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()

  const groupedRoutes = useMemo(() => getGroupedRoutes(), [])

  const isActive = (pattern: string) => {
    if (!pathname) return false
    return micromatch.isMatch(pathname, pattern)
  }

  return (
    <SidebarContent className="overflow-x-hidden gap-0">
      {Object.entries(groupedRoutes).map(([group, routes]) => (
        <SidebarGroup key={group}>
          {group !== 'ungrouped' && (
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
          )}
          <SidebarMenu>
            {routes.map((route) => {
              // handle default tab if route has tabs
              let href = route.path(selectedTeamIdentifier ?? '')
              if (route.tabs) {
                const defaultTab = route.tabs.find((t) => t.isDefault)
                if (defaultTab) {
                  href = `${href}?tab=${defaultTab.id}`
                }
              }

              return (
                <SidebarMenuItem key={route.id}>
                  <SidebarMenuButton
                    variant={
                      isActive(route.activePattern) ? 'active' : 'default'
                    }
                    asChild
                    tooltip={route.label}
                  >
                    <Link
                      suppressHydrationWarning
                      href={href}
                      prefetch
                      onClick={
                        isMobile
                          ? () => {
                              setOpenMobile(false)
                            }
                          : undefined
                      }
                    >
                      <route.icon
                        className={cn(
                          'group-data-[collapsible=icon]:size-5 transition-[size,color]',
                          SIDEBAR_TRANSITION_CLASSNAMES,
                          isActive(route.activePattern) &&
                            'text-accent-main-highlight'
                        )}
                      />
                      <span>{route.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}
