import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { TEAM_SPECIFIC_RESOURCE_SEGMENTS } from '@/configs/urls'
import type { TeamModel } from '@/core/modules/teams/models'
import { getTeamDisplayName } from '@/core/modules/teams/utils'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/primitives/dropdown-menu'
import { useDashboard } from '../context'
import { TeamAvatar } from './team-avatar'

const PRESERVED_SEARCH_PARAMS = ['tab'] as const

export default function DashboardSidebarMenuTeams() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { user, team: selectedTeam, teams } = useDashboard()

  const getNextUrl = useCallback(
    (team: TeamModel) => {
      const splitPath = pathname.split('/')
      // splitPath: ["", "dashboard", teamIdOrSlug, section?, resourceId?, ...]
      const originalSlug = splitPath[2]
      splitPath[2] = team.slug

      // If actually switching teams and the current section has team-specific
      // resource sub-paths, truncate to the section root to avoid 404s.
      // e.g. /dashboard/old-team/sandboxes/abc123/monitoring
      //    → /dashboard/new-team/sandboxes
      const section = splitPath[3]
      if (
        team.slug !== originalSlug &&
        section &&
        TEAM_SPECIFIC_RESOURCE_SEGMENTS.includes(section) &&
        splitPath.length > 4
      ) {
        splitPath.length = 4
      }

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
        <DropdownMenuLabel className="mt-2 mb-2 pb-0 px-2 font-sans prose-label">
          {user.email}
        </DropdownMenuLabel>
      )}
      {teams.length > 0 ? (
        teams.map((team) => (
          <Link href={getNextUrl(team)} passHref key={team.id}>
            <DropdownMenuRadioItem
              value={team.id}
              className="h-9 [&_svg]:size-5"
            >
              <TeamAvatar
                team={team}
                classNames={{ root: 'size-6 shrink-0 border-none' }}
              />
              <span className="flex-1 truncate font-sans prose-body-highlight">
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
