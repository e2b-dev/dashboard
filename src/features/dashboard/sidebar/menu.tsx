'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/auth/auth-actions'
import { ClientTeam } from '@/types/dashboard.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { Skeleton } from '@/ui/primitives/skeleton'
import { ChevronsUpDown, LogOut, Plus, UserRoundCog } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'
import { useDashboard } from '../context'
import { CreateTeamDialog } from './create-team-dialog'
import DashboardSidebarMenuTeams from './menu-teams'

interface DashboardSidebarMenuProps {
  initialTeam?: ClientTeam
  className?: string
}

export default function DashboardSidebarMenu({
  initialTeam,
  className,
}: DashboardSidebarMenuProps) {
  const hasSetInitialteam = useRef(false)
  const { setTeam, team } = useDashboard()

  useLayoutEffect(() => {
    if (!hasSetInitialteam.current && initialTeam) {
      setTeam(initialTeam)
      hasSetInitialteam.current = true
    }
  }, [initialTeam, setTeam])

  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  const handleLogout = () => {
    signOutAction()
  }

  return (
    <>
      <SidebarMenuItem className="px-3 pb-2 group-data-[collapsible=icon]:p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              variant="outline"
              size="lg"
              className={cn(
                'h-14 flex',
                'group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:!px-0',
                className
              )}
            >
              {team ? (
                <>
                  <Avatar
                    className={cn(
                      'shrink-0 transition-all duration-100 ease-in-out',
                      'group-data-[collapsible=icon]:block group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-[5px]',
                      {
                        'drop-shadow-sm filter': team?.profile_picture_url,
                      }
                    )}
                  >
                    <AvatarImage
                      src={team?.profile_picture_url || undefined}
                      className="group-data-[collapsible=icon]:size-full object-cover object-center"
                    />
                    <AvatarFallback className="bg-bg-hover border-0">
                      {team?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left  leading-tight">
                    <span className="text-fg-tertiary font-mono truncate prose-label">
                      TEAM
                    </span>
                    {team ? (
                      <span className="text-fg truncate prose-body-highlight normal-case">
                        {team.transformed_default_name || team.name}
                      </span>
                    ) : (
                      <Skeleton className="h-4 w-full" />
                    )}
                  </div>
                  <ChevronsUpDown className="text-fg-tertiary ml-auto size-4" />
                </>
              ) : (
                <Skeleton className="h-14 w-full" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            collisionPadding={10}
            className="w-[280px] px-3"
            align="start"
            sideOffset={4}
          >
            <DashboardSidebarMenuTeams />

            <DropdownMenuItem
              className="text-accent-main-highlight mt-1 font-sans prose-label-highlight"
              onSelect={() => setCreateTeamOpen(true)}
            >
              <Plus className="ml-0.5 size-5" /> Create New Team
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuGroup className="gap-1 pt-0 pb-2">
              <DropdownMenuItem
                className="font-sans prose-label-highlight"
                asChild
              >
                <Link href={PROTECTED_URLS.ACCOUNT_SETTINGS}>
                  <UserRoundCog className="size-4" /> Account Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="error"
                className="font-sans prose-label-highlight"
                onSelect={handleLogout}
              >
                <LogOut className="size-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
      />
    </>
  )
}
