'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { useSelectedTeam, useTeams } from '@/lib/hooks/use-teams'
import { useRouter } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import { Skeleton } from '@/ui/primitives/skeleton'
import { Plus, LogOut, UserRoundCog, ChevronsUpDown } from 'lucide-react'
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types'
import { useUser } from '@/lib/hooks/use-user'
import { signOutAction } from '@/server/auth/auth-actions'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import Link from 'next/link'
import { CreateTeamDialog } from './create-team-dialog'
import { useState } from 'react'

interface DashboardSidebarMenuProps {
  className?: string
}

export default function DashboardSidebarMenu({
  className,
}: DashboardSidebarMenuProps) {
  const { teams } = useTeams()
  const { user } = useUser()
  const selectedTeam = useSelectedTeam()
  const router = useRouter()
  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  const handleTeamChange = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (team) {
      router.push(PROTECTED_URLS.SANDBOXES(team.slug || teamId))
      router.refresh()
    }
  }

  const handleLogout = () => {
    signOutAction()
  }

  const handleMenuOpenChange = (open: boolean) => {
    if (open && teams.length > 0) {
      teams.forEach((team) => {
        const url = PROTECTED_URLS.SANDBOXES(team.slug || team.id)
        router.prefetch(url, { kind: PrefetchKind.FULL })
      })
    }
  }

  return (
    <>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              variant="outline"
              size="lg"
              className={cn(
                'hover:bg-bg-100 group-data-[collapsible=icon]:pl-0!',
                className
              )}
            >
              <Avatar
                className={cn('size-8 shrink-0 transition-all duration-300', {
                  'border-0 drop-shadow-lg filter':
                    selectedTeam?.profile_picture_url,
                })}
              >
                <AvatarImage
                  src={selectedTeam?.profile_picture_url || undefined}
                />
                <AvatarFallback className="bg-bg-200 border-0">
                  {selectedTeam?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-fg-500 text-mono truncate text-[0.75rem]">
                  TEAM
                </span>
                {selectedTeam ? (
                  <span className="text-fg truncate font-sans text-sm normal-case">
                    {selectedTeam.name}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-full" />
                )}
              </div>
              <ChevronsUpDown className="text-fg-500 ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            collisionPadding={10}
            className="w-[280px] px-3"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuRadioGroup
              value={selectedTeam?.id}
              onValueChange={handleTeamChange}
            >
              {user?.email && (
                <DropdownMenuLabel className="mb-2">
                  {user.email}
                </DropdownMenuLabel>
              )}
              {teams.length > 0 ? (
                teams.map((team) => (
                  <DropdownMenuRadioItem key={team.id} value={team.id}>
                    <Avatar className="size-5 shrink-0 border-none">
                      <AvatarImage
                        src={team.profile_picture_url || undefined}
                      />
                      <AvatarFallback className="bg-bg-400 group-focus:text-accent text-fg-500 text-xs">
                        {team.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate font-sans">
                      {team.name}
                    </span>
                  </DropdownMenuRadioItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No teams available</DropdownMenuItem>
              )}
            </DropdownMenuRadioGroup>

            <DropdownMenuItem
              className="text-accent mt-1 font-sans"
              onSelect={() => setCreateTeamOpen(true)}
            >
              <Plus className="ml-0.5 size-5" /> Create New Team
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuGroup className="gap-1 pt-0 pb-2">
              <DropdownMenuItem className="font-sans" asChild>
                <Link href={PROTECTED_URLS.ACCOUNT_SETTINGS}>
                  <UserRoundCog className="size-4" /> Account Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="error"
                className="font-sans"
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
