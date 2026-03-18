'use client'

import type { User } from '@supabase/supabase-js'
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { DashboardContextProvider } from '@/features/dashboard/context'
import { useTRPC } from '@/trpc/client'
import Unauthorized from '../unauthorized'

interface DashboardTeamGateProps {
  teamIdOrSlug: string
  user: User
  children: React.ReactNode
}

function TeamContent({ teamIdOrSlug, user, children }: DashboardTeamGateProps) {
  const trpc = useTRPC()

  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions())

  const team = teams.find(
    (candidate) =>
      candidate.id === teamIdOrSlug || candidate.slug === teamIdOrSlug
  )

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
