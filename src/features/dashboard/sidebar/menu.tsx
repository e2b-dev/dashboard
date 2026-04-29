'use client'

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
import {
  AccountSettingsIcon,
  AddIcon,
  LogoutIcon,
  UnpackIcon,
} from '@/ui/primitives/icons'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { useDashboard } from '../context'
import { CreateTeamDialog } from './create-team-dialog'
import DashboardSidebarMenuTeams from './menu-teams'
import { TeamAvatar } from './team-avatar'

export default function DashboardSidebarMenu() {
  const { team } = useDashboard()
  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  const handleLogout = () => {
    signOutAction()
  }

  return (
    <>
      <SidebarMenuItem className="h-14 px-3 pb-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton variant="outline" size="switcher">
              <TeamAvatar
                team={team}
                classNames={{
                  root: cn(
                    'size-8 shrink-0 transition-all duration-100 ease-in-out',
                    'group-data-[collapsible=icon]:block group-data-[collapsible=icon]:size-9',
                    {
                      'drop-shadow-sm filter': team.profilePictureUrl,
                    }
                  ),
                  image: 'group-data-[collapsible=icon]:size-full',
                }}
              />
              <div className="grid flex-1 text-left  leading-tight">
                <span className="text-fg-tertiary truncate prose-label">
                  TEAM
                </span>
                <span className="text-fg truncate prose-body-highlight normal-case">
                  {getTeamDisplayName(team)}
                </span>
              </div>
              <UnpackIcon className="text-fg-tertiary ml-auto size-4!" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            collisionPadding={10}
            className="w-[280px] p-2"
            align="start"
            sideOffset={4}
          >
            <DashboardSidebarMenuTeams />

            <DropdownMenuItem
              className="h-9 gap-2.5 [&_svg]:size-5 font-sans prose-body-highlight"
              onSelect={() => setCreateTeamOpen(true)}
            >
              <AddIcon className="ml-0.5" /> Create new team
            </DropdownMenuItem>

            <DropdownMenuSeparator className="-mx-2" />

            <DropdownMenuGroup className="gap-0 pt-0 pb-0">
              <DropdownMenuItem
                className="h-9 gap-2.5 [&_svg]:size-5 font-sans prose-body-highlight"
                asChild
              >
                <Link href={PROTECTED_URLS.ACCOUNT_SETTINGS}>
                  <AccountSettingsIcon className="ml-0.5" /> Account settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="error"
                className="h-9 gap-2.5 [&_svg]:size-5 font-sans prose-body-highlight"
                onSelect={handleLogout}
              >
                <LogoutIcon className="ml-0.5" /> Log out
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
