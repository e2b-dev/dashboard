'use client'

import type { User } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import { DashboardContextProvider } from '@/features/dashboard/context'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { useTRPC } from '@/trpc/client'
import Unauthorized from '../unauthorized'

interface DashboardTeamGateProps {
  teamSlug: string
  user: User
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
