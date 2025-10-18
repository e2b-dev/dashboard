'use client'

import { ClientTeam } from '@/types/dashboard.types'
import { User } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useState } from 'react'

interface DashboardContextValue {
  team: ClientTeam | null
  user: User

  setTeam: (team: ClientTeam | null) => void
  setUser: (user: User) => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

interface DashboardContextProviderProps {
  children: ReactNode
  initialTeam: ClientTeam | null
  initialUser: User
}

export function DashboardContextProvider({
  children,
  initialTeam,
  initialUser,
}: DashboardContextProviderProps) {
  const [team, setTeam] = useState(initialTeam)
  const [user, setUser] = useState(initialUser)

  const value = {
    team,
    user,

    setTeam,
    setUser,
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
