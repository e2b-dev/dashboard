import { UserTeamsResponse } from '@/app/api/teams/user/types'
import { useTeamCookieManager } from '@/lib/hooks/use-team'
import { ClientTeam } from '@/types/dashboard.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/primitives/dropdown-menu'
import { Skeleton } from '@/ui/primitives/skeleton'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import useSWR from 'swr'
import { useDashboard } from '../context'

const PRESERVED_SEARCH_PARAMS = ['tab'] as const

export default function DashboardSidebarMenuTeams() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { user, team: selectedTeam } = useDashboard()

  useTeamCookieManager()

  const { data: teams, isLoading } = useSWR<ClientTeam[] | null>(
    ['/api/teams/user', user?.id],
    async ([url, userId]: [string, string | undefined]) => {
      if (!userId) {
        return null
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.status}`)
      }

      const { teams } = (await response.json()) as UserTeamsResponse

      return teams
    },
    {
      keepPreviousData: true,
    }
  )

  const getNextUrl = useCallback(
    (team: ClientTeam) => {
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

  if (isLoading) {
    return (
      <>
        {user?.email && (
          <DropdownMenuLabel className="mb-2">
            <Skeleton className="h-3 w-40 bg-bg-inverted/10" />
          </DropdownMenuLabel>
        )}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="relative flex select-none items-center gap-2 px-2 py-1.5 pr-10"
          >
            <Skeleton className="size-5 shrink-0 bg-bg-inverted/10" />
            <Skeleton className="h-3.5 flex-1 bg-bg-inverted/10" />
          </div>
        ))}
      </>
    )
  }

  return (
    <DropdownMenuRadioGroup value={selectedTeam?.id}>
      {user?.email && (
        <DropdownMenuLabel className="mb-2">{user.email}</DropdownMenuLabel>
      )}
      {teams && teams.length > 0 ? (
        teams.map((team) => (
          <Link href={getNextUrl(team)} passHref key={team.id}>
            <DropdownMenuRadioItem value={team.id}>
              <Avatar className="size-5 shrink-0 border-none">
                <AvatarImage src={team.profile_picture_url || undefined} />
                <AvatarFallback className="group-focus:text-accent-main-highlight text-fg-tertiary text-xs">
                  {team.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate font-sans prose-label-highlight">
                {team.transformed_default_name || team.name}
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
