'use client'

import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { COOKIE_KEYS } from '@/configs/cookies'
import type { AuthUser } from '@/core/modules/auth/models'
import type { TeamModel } from '@/core/modules/teams/models'
import { setBrowserCookie } from '@/lib/utils/browser-cookies'

interface DashboardContextValue {
  team: TeamModel
  teams: TeamModel[]
  user: AuthUser
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

interface DashboardContextProviderProps {
  children: ReactNode
  initialTeam: TeamModel
  initialTeams: TeamModel[]
  initialUser: AuthUser
}

export function DashboardContextProvider({
  children,
  initialTeam,
  initialTeams,
  initialUser,
}: DashboardContextProviderProps) {
  const updateTeamCookieState = useDebounceCallback((team: TeamModel) => {
    setBrowserCookie(COOKIE_KEYS.SELECTED_TEAM_ID, team.id)
    setBrowserCookie(COOKIE_KEYS.SELECTED_TEAM_SLUG, team.slug)
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
