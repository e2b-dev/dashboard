'use client'

import { useEffect } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import type { ClientTeam } from '@/core/domains/teams/models'
import { useDashboard } from '@/features/dashboard/context'

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
