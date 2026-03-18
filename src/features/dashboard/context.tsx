'use client'

import type { User } from '@supabase/supabase-js'
import { createContext, type ReactNode, useContext } from 'react'
import type { ClientTeam } from '@/core/domains/teams/models'

interface DashboardContextValue {
  team: ClientTeam
  teams: ClientTeam[]
  user: User
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

interface DashboardContextProviderProps {
  children: ReactNode
  initialTeam: ClientTeam
  initialTeams: ClientTeam[]
  initialUser: User
}

export function DashboardContextProvider({
  children,
  initialTeam,
  initialTeams,
  initialUser,
}: DashboardContextProviderProps) {
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
