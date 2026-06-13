'use client'

import { useQuery } from '@tanstack/react-query'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import { DASHBOARD_USER_PROFILE_QUERY_OPTIONS } from '@/core/application/user/queries'
import type { AuthUser } from '@/core/modules/auth/models'
import { DashboardContextProvider } from '@/features/dashboard/context'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useTRPC } from '@/trpc/client'
import Unauthorized from '../unauthorized'

interface DashboardTeamGateProps {
  teamSlug: string
  fallbackUser: AuthUser
  children: React.ReactNode
}

export function DashboardTeamGate({
  teamSlug,
  fallbackUser,
  children,
}: DashboardTeamGateProps) {
  const trpc = useTRPC()

  const { data: teams, isPending: teamsPending } = useQuery(
    trpc.teams.list.queryOptions(undefined, DASHBOARD_TEAMS_LIST_QUERY_OPTIONS)
  )

  const { data: user, isPending: userPending } = useQuery(
    trpc.user.profile.queryOptions(
      undefined,
      DASHBOARD_USER_PROFILE_QUERY_OPTIONS
    )
  )

  if (teamsPending || userPending) {
    return <LoadingLayout />
  }

  const resolvedUser = user ?? fallbackUser
  const team = teams?.find((candidate) => candidate.slug === teamSlug)

  if (!team || !teams) {
    return <Unauthorized />
  }

  return (
    <DashboardContextProvider
      initialTeam={team}
      initialTeams={teams}
      initialUser={resolvedUser}
    >
      {children}
    </DashboardContextProvider>
  )
}
