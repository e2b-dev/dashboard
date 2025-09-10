'use client'

import {
  DashboardNavLink,
  MAIN_DASHBOARD_LINKS,
} from '@/configs/dashboard-navs'
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

type GroupedLinks = {
  [key: string]: DashboardNavLink[]
}

const createGroupedLinks = (links: DashboardNavLink[]): GroupedLinks => {
  return links.reduce((acc, link) => {
    const group = link.group || 'ungrouped'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(link)
    return acc
  }, {} as GroupedLinks)
}

export default function DashboardSidebarContent() {
  const selectedTeam = useSelectedTeam()
  const selectedTeamIdentifier = selectedTeam?.slug ?? selectedTeam?.id
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()

  const groupedNavLinks = useMemo(
    () => createGroupedLinks(MAIN_DASHBOARD_LINKS),
    []
  )

  const isActive = (link: DashboardNavLink) => {
    if (!pathname || !link.activeMatch) return false

    return micromatch.isMatch(pathname, link.activeMatch)
  }

  return (
    <SidebarContent className="overflow-x-hidden gap-0">
      {Object.entries(groupedNavLinks).map(([group, links], ix) => (
        <SidebarGroup key={group}>
          {group !== 'ungrouped' && (
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
          )}
          <SidebarMenu>
            {links.map((item) => {
              const href = item.href({
                teamIdOrSlug: selectedTeamIdentifier ?? undefined,
              })

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    variant={isActive(item) ? 'active' : 'default'}
                    asChild
                    tooltip={item.label}
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
                      <item.icon
                        className={cn(
                          'group-data-[collapsible=icon]:size-5 transition-[size,color]',
                          SIDEBAR_TRANSITION_CLASSNAMES,
                          isActive(item) && 'text-accent-main-highlight'
                        )}
                      />
                      <span>{item.label}</span>
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
