'use client'

import type { User } from '@supabase/supabase-js'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { ClientTeam } from '@/types/dashboard.types'
import { ReferralSourceDialog } from './referral-source-dialog'

interface DashboardContextValue {
  team: ClientTeam
  user: User

  setTeam: (team: ClientTeam) => void
  setUser: (user: User) => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

interface DashboardContextProviderProps {
  children: ReactNode
  initialTeam: ClientTeam
  initialUser: User
}

export function DashboardContextProvider({
  children,
  initialTeam,
  initialUser,
}: DashboardContextProviderProps) {
  const [team, setTeam] = useState(initialTeam)
  const [user, setUser] = useState(initialUser)
  const [showReferralDialog, setShowReferralDialog] = useState(false)

  useEffect(() => {
    const referralAsked = user?.user_metadata?.referral_asked
    if (user && !referralAsked) {
      setShowReferralDialog(true)
    }
  }, [user])

  const value = {
    team,
    user,

    setTeam,
    setUser,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
      <ReferralSourceDialog
        userEmail={user.email ?? ''}
        open={showReferralDialog}
        onOpenChange={setShowReferralDialog}
      />
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
