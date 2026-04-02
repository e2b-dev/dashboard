'use client'

import type { User } from '@supabase/supabase-js'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import { DashboardContextProvider } from '@/features/dashboard/context'
import { useTRPC } from '@/trpc/client'
import Unauthorized from '../unauthorized'

interface DashboardTeamGateProps {
  teamSlug: string
  user: User
  children: React.ReactNode
}

function TeamContent({ teamSlug, user, children }: DashboardTeamGateProps) {
  const trpc = useTRPC()

  const { data: teams } = useSuspenseQuery(
    trpc.teams.list.queryOptions(undefined, DASHBOARD_TEAMS_LIST_QUERY_OPTIONS)
  )

  const team = teams.find((candidate) => candidate.slug === teamSlug)

  if (!team) {
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
export function DashboardTeamGate(props: DashboardTeamGateProps) {
  return <TeamContent {...props} />
}
