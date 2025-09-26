'use client'

import { ACCOUNT_ROUTE, DASHBOARD_ROUTES } from '@/configs/dashboard-routes'
import useKeydown from '@/lib/hooks/use-keydown'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { cn } from '@/lib/utils'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/primitives/command'
import { Kbd } from '@/ui/primitives/kbd'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/ui/primitives/sidebar'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DashboardSidebarCommandProps {
  className?: string
}

export default function DashboardSidebarCommand({
  className,
}: DashboardSidebarCommandProps) {
  const [open, setOpen] = useState(false)
  const selectedTeam = useSelectedTeam()
  const router = useRouter()

  const { open: sidebarOpen, openMobile: sidebarOpenMobile } = useSidebar()
  const isSidebarOpen = sidebarOpen || sidebarOpenMobile

  useKeydown((event) => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(true)
    }

    return true
  })

  return (
    <>
      <SidebarMenuItem className="transition-[margin,padding] mx-3 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:!p-0 ">
        <SidebarMenuButton
          tooltip="Go to..."
          variant={isSidebarOpen ? 'outline' : 'default'}
          className={cn(
            'text-fg-tertiary h-10 relative transition-all',
            'group-data-[collapsible=icon]:border-x-0 group-data-[collapsible=icon]:border-y group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0',
            className
          )}
          onClick={() => setOpen(true)}
        >
          <ChevronRight className="text-fg-tertiary size-4 group-data-[collapsible=icon]:hidden" />
          <span className="group-data-[collapsible=icon]:hidden">Go to</span>
          <Kbd
            keys={['cmd', 'k']}
            className="pointer-events-none group-data-[collapsible=icon]:mx-auto ml-auto"
            badgeProps={{
              className: 'group-data-[collapsible=icon]:!bg-transparent',
            }}
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Quick Jump to..." />
        <CommandList className="p-1 pb-3">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {[...DASHBOARD_ROUTES, ACCOUNT_ROUTE].map((route) => {
              const teamIdOrSlug = selectedTeam?.slug ?? selectedTeam?.id ?? ''
              // handle default tab for routes with tabs
              let href = route.path(teamIdOrSlug)
              if (route.tabs) {
                const defaultTab = route.tabs.find((t) => t.isDefault)
                if (defaultTab) {
                  href = `${href}?tab=${defaultTab.id}`
                }
              }

              return (
                <CommandItem
                  key={route.id}
                  onSelect={() => {
                    router.push(href)
                    setOpen(false)
                  }}
                  className="group"
                >
                  <route.icon className="text-fg-tertiary group-[&[data-selected=true]]:text-accent-main-highlight  !size-4" />
                  {route.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
