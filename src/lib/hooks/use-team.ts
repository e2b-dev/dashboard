'use client'

import { useDashboard } from '@/features/dashboard/context'
import { ClientTeam } from '@/types/dashboard.types'
import { useEffect } from 'react'
import { useDebounceCallback } from 'usehooks-ts'

export const useTeamCookieManager = () => {
  const { team } = useDashboard()

  const updateTeamCookieState = useDebounceCallback(
    async (iTeam: ClientTeam) => {
      await fetch('/api/team/state', {
        method: 'POST',
        body: JSON.stringify({
          teamId: iTeam.id,
          teamSlug: iTeam.slug,
        }),
      })
    },
    1000
  )

  useEffect(() => {
    if (!team) {
      return
    }

    updateTeamCookieState(team)
  }, [updateTeamCookieState, team])
}
