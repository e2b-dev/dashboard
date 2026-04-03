import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { TeamModel } from '@/core/modules/teams/models'
import { getTeamDisplayName } from '@/core/modules/teams/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/primitives/dropdown-menu'
import { useDashboard } from '../context'

const PRESERVED_SEARCH_PARAMS = ['tab'] as const

export default function DashboardSidebarMenuTeams() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { user, team: selectedTeam, teams } = useDashboard()

  const getNextUrl = useCallback(
    (team: TeamModel) => {
      const splitPath = pathname.split('/')
      splitPath[2] = team.slug

      const preservedParams = new URLSearchParams()
      for (const param of PRESERVED_SEARCH_PARAMS) {
        const value = searchParams.get(param)
        if (value) {
          preservedParams.set(param, value)
        }
      }

      const queryString = preservedParams.toString()
      return queryString
        ? `${splitPath.join('/')}?${queryString}`
        : splitPath.join('/')
    },
    [pathname, searchParams]
  )

  return (
    <DropdownMenuRadioGroup value={selectedTeam?.id}>
      {user?.email && (
        <DropdownMenuLabel className="mb-2">{user.email}</DropdownMenuLabel>
      )}
      {teams.length > 0 ? (
        teams.map((team) => (
          <Link href={getNextUrl(team)} passHref key={team.id}>
            <DropdownMenuRadioItem value={team.id}>
              <Avatar className="size-5 shrink-0 border-none">
                <AvatarImage src={team.profilePictureUrl || undefined} />
                <AvatarFallback className="group-focus:text-accent-main-highlight text-fg-tertiary text-xs">
                  {team.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate font-sans prose-label-highlight">
                {getTeamDisplayName(team)}
              </span>
            </DropdownMenuRadioItem>
          </Link>
        ))
      ) : (
        <DropdownMenuItem disabled>No teams available</DropdownMenuItem>
      )}
    </DropdownMenuRadioGroup>
  )
}
