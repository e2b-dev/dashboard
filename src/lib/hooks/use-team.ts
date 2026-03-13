'use client'

import { useEffect } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { useDashboard } from '@/features/dashboard/context'
import type { ClientTeam } from '@/types/dashboard.types'

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
