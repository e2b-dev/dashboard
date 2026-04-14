'use client'

import type { User } from '@supabase/supabase-js'
import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import type { TeamModel } from '@/core/modules/teams/models'

interface DashboardContextValue {
  team: TeamModel
  teams: TeamModel[]
  user: User
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

interface DashboardContextProviderProps {
  children: ReactNode
  initialTeam: TeamModel
  initialTeams: TeamModel[]
  initialUser: User
}

export function DashboardContextProvider({
  children,
  initialTeam,
  initialTeams,
  initialUser,
}: DashboardContextProviderProps) {
  const updateTeamCookieState = useDebounceCallback(async (team: TeamModel) => {
    await fetch('/api/team/state', {
      method: 'POST',
      body: JSON.stringify({
        teamId: team.id,
        teamSlug: team.slug,
      }),
    })
  }, 1000)

  useEffect(() => {
    updateTeamCookieState(initialTeam)
  }, [initialTeam, updateTeamCookieState])

  const value = {
    team: initialTeam,
    teams: initialTeams,
    user: initialUser,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error(
      'useDashboardContext must be used within a DashboardContextProvider'
    )
  }
  return context
}
