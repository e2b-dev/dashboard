'use client'

import { ChevronsUpDown, LogOut, Plus, UserRoundCog } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { getTeamDisplayName } from '@/core/modules/teams/utils'
import { signOutAction } from '@/core/server/actions/auth-actions'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { useDashboard } from '../context'
import { CreateTeamDialog } from './create-team-dialog'
import DashboardSidebarMenuTeams from './menu-teams'
import { TeamAvatar } from './team-avatar'

interface DashboardSidebarMenuProps {
  className?: string
}

export default function DashboardSidebarMenu({
  className,
}: DashboardSidebarMenuProps) {
  const { team } = useDashboard()
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
                'group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:px-0!',
                className
              )}
            >
              <TeamAvatar
                team={team}
                className={cn(
                  'shrink-0 transition-all duration-100 ease-in-out',
                  'group-data-[collapsible=icon]:block group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-[5px]',
                  {
                    'drop-shadow-sm filter': team.profilePictureUrl,
                  }
                )}
                imageClassName="group-data-[collapsible=icon]:size-full"
              />
              <div className="grid flex-1 text-left  leading-tight">
                <span className="text-fg-tertiary font-mono truncate prose-label">
                  TEAM
                </span>
                <span className="text-fg truncate prose-body-highlight normal-case">
                  {getTeamDisplayName(team)}
                </span>
              </div>
              <ChevronsUpDown className="text-fg-tertiary ml-auto size-4" />
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
