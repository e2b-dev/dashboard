'use client'

import { ALL_DASHBOARD_LINKS } from '@/configs/dashboard-navs'
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
import { Terminal } from 'lucide-react'
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
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Jump"
          variant={isSidebarOpen ? 'outline' : 'default'}
          className={cn('text-fg-500 relative h-10 transition-all', className)}
          onClick={() => setOpen(true)}
        >
          <Terminal className="text-fg-500 size-4" />
          Jump to
          <Kbd keys={['cmd', 'k']} className="pointer-events-none ml-auto" />
        </SidebarMenuButton>
      </SidebarMenuItem>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Quick Jump to..." />
        <CommandList className="p-1 pb-3">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {ALL_DASHBOARD_LINKS.map((link) => (
              <CommandItem
                key={link.label}
                onSelect={() => {
                  router.push(
                    link.href({
                      teamIdOrSlug:
                        selectedTeam?.slug ?? selectedTeam?.id ?? undefined,
                    })
                  )
                  setOpen(false)
                }}
                className="group"
              >
                <link.icon className="text-fg-500 group-[&[data-selected=true]]:text-accent !size-4" />
                {link.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
