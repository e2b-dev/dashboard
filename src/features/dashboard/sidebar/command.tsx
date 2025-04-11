'use client'

import { cn } from '@/lib/utils'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/primitives/command'
import { useEffect, useState } from 'react'
import { ALL_DASHBOARD_LINKS } from '@/configs/dashboard-navs'
import { useRouter } from 'next/navigation'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { Search } from 'lucide-react'
import { Kbd } from '@/ui/primitives/kbd'

interface DashboardSidebarCommandProps {
  className?: string
}

export default function DashboardSidebarCommand({
  className,
}: DashboardSidebarCommandProps) {
  const [open, setOpen] = useState(false)
  const selectedTeam = useSelectedTeam()
  const router = useRouter()

  useEffect(() => {
    const controller = new AbortController()

    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [])

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Jump"
          variant="outline"
          className={cn('text-fg-500 h-10', className)}
          onClick={() => setOpen(true)}
        >
          <span className="text-md px-1 font-mono">{'>'}</span>
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
