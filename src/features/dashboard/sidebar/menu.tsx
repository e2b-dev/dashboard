'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useSelectedTeam, useTeams } from '@/lib/hooks/use-teams'
import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/auth/auth-actions'
import { ClientTeam } from '@/types/dashboard.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
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
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { Skeleton } from '@/ui/primitives/skeleton'
import { ChevronsUpDown, LogOut, Plus, UserRoundCog } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { CreateTeamDialog } from './create-team-dialog'

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
  const pathname = usePathname()

  const getNextUrl = useCallback(
    (team: ClientTeam) => {
      if (!selectedTeam) return PROTECTED_URLS.DASHBOARD

      // use word boundaries to prevent partial replacements and ensure /dashboard/ prefix
      const slugPattern = new RegExp(`/dashboard/${selectedTeam.slug}\\b`, 'g')
      const idPattern = new RegExp(`/dashboard/${selectedTeam.id}\\b`, 'g')

      return pathname
        .replace(slugPattern, `/dashboard/${team.slug}`)
        .replace(idPattern, `/dashboard/${team.id}`)
    },
    [selectedTeam, pathname]
  )

  const handleTeamChange = useCallback(
    async (teamId: string) => {
      const team = teams.find((t) => t.id === teamId)

      if (!team || !selectedTeam || team.id === selectedTeam.id) return

      await fetch('/api/team/state', {
        method: 'POST',
        body: JSON.stringify({ teamId: team.id, teamSlug: team.slug }),
      })

      router.push(getNextUrl(team))
      router.refresh()
    },
    [teams, selectedTeam, router, getNextUrl]
  )

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
              <Avatar
                className={cn(
                  'shrink-0 transition-all duration-100 ease-in-out',
                  'group-data-[collapsible=icon]:block group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-[5px]',
                  {
                    'drop-shadow-sm filter': selectedTeam?.profile_picture_url,
                  }
                )}
              >
                <AvatarImage
                  src={selectedTeam?.profile_picture_url || undefined}
                  className="group-data-[collapsible=icon]:size-full object-cover object-center"
                />
                <AvatarFallback className="bg-bg-hover border-0">
                  {selectedTeam?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left  leading-tight">
                <span className="text-fg-tertiary font-mono truncate prose-label">
                  TEAM
                </span>
                {selectedTeam ? (
                  <span className="text-fg truncate prose-body-highlight normal-case">
                    {selectedTeam.transformed_default_name || selectedTeam.name}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-full" />
                )}
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
                  <DropdownMenuRadioItem key={team.id} value={team.id} asChild>
                    <Link href={getNextUrl(team)}>
                      <Avatar className="size-5 shrink-0 border-none">
                        <AvatarImage
                          src={team.profile_picture_url || undefined}
                        />
                        <AvatarFallback className="group-focus:text-accent-main-highlight text-fg-tertiary text-xs">
                          {team.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate font-sans prose-label-highlight">
                        {team.transformed_default_name || team.name}
                      </span>
                    </Link>
                  </DropdownMenuRadioItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No teams available</DropdownMenuItem>
              )}
            </DropdownMenuRadioGroup>

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
