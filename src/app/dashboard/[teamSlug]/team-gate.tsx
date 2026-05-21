'use client'

import { useQuery } from '@tanstack/react-query'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import type { AuthUser } from '@/core/server/auth'
import { DashboardContextProvider } from '@/features/dashboard/context'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useTRPC } from '@/trpc/client'
import Unauthorized from '../unauthorized'

interface DashboardTeamGateProps {
  teamSlug: string
  user: AuthUser
  children: React.ReactNode
}

export function DashboardTeamGate({
  teamSlug,
  user,
  children,
}: DashboardTeamGateProps) {
  const trpc = useTRPC()

  const { data: teams, isPending } = useQuery(
    trpc.teams.list.queryOptions(undefined, DASHBOARD_TEAMS_LIST_QUERY_OPTIONS)
  )

  if (isPending) {
    return <LoadingLayout />
  }

  const team = teams?.find((candidate) => candidate.slug === teamSlug)

  if (!team || !teams) {
    return <Unauthorized />
  }

  return (
    <DashboardContextProvider
      initialTeam={team}
      initialTeams={teams}
      initialUser={user}
    >
      {children}
    </DashboardContextProvider>
  )
}
