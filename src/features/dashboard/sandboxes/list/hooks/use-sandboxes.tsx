'use client'

import { SandboxesListResponse } from '@/app/api/teams/[teamId]/sandboxes/list/types'
import { SWR_KEYS } from '@/configs/keys'
import { Sandboxes } from '@/types/api.types'
import useSWR from 'swr'
import { useDashboard } from '../../../context'

interface UseSandboxesProps {
  initialSandboxes?: Sandboxes
  pollingInterval?: number
}

export function useSandboxes({
  initialSandboxes,
  pollingInterval = 15_000,
}: UseSandboxesProps) {
  const { team } = useDashboard()

  const swrKey = team ? SWR_KEYS.SANDBOXES_LIST(team.id) : [null]

  const swr = useSWR<SandboxesListResponse>(
    swrKey,
    async ([url]: [string | null]) => {
      if (!url) {
        return {
          sandboxes: initialSandboxes || [],
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch sandboxes list')
      }

      return (await response.json()) as SandboxesListResponse
    },
    {
      refreshInterval: pollingInterval,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      shouldRetryOnError: false,
      revalidateOnMount: false,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      fallbackData: initialSandboxes
        ? { sandboxes: initialSandboxes }
        : undefined,
    }
  )

  return swr
}
