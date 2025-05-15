'use client'

import { DashboardNavLink } from '@/configs/dashboard-navs'
import { MAIN_DASHBOARD_LINKS } from '@/configs/dashboard-navs'
import { cn } from '@/lib/utils'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import Link from 'next/link'
import { useMemo } from 'react'

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/ui/primitives/sidebar'
import { usePathname } from 'next/navigation'
import TeamBlockageAlert from './blocked-banner'

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

  const groupedNavLinks = useMemo(
    () => createGroupedLinks(MAIN_DASHBOARD_LINKS),
    []
  )

  const isActive = (href: string) => {
    return href === pathname
  }

  return (
    <SidebarContent className="overflow-x-hidden">
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
                    variant={isActive(href) ? 'active' : 'default'}
                    asChild
                    tooltip={item.label}
                  >
                    <Link suppressHydrationWarning prefetch href={href}>
                      <item.icon
                        className={cn(
                          'text-fg-500 w-4',
                          isActive(href) && 'text-accent/80'
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
