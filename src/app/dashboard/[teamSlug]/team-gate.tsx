'use client'

import type { User } from '@supabase/supabase-js'
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
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
    throw new Error('Team not found or access denied')
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
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={<Unauthorized />}>
          <Suspense>
            <TeamContent {...props} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
