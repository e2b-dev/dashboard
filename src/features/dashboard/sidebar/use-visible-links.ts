'use client'

import { useMemo } from 'react'
import { filterSidebarLinks, type SidebarNavItem } from '@/configs/sidebar'
import { useFeatureFlags } from '@/core/modules/feature-flags/feature-flags.client'
import { useDashboard } from '@/features/dashboard/context'

export function useVisibleSidebarLinks(links: SidebarNavItem[]) {
  const { getPayload, isEnabled } = useFeatureFlags()
  const { team } = useDashboard()

  return useMemo(
    () => filterSidebarLinks(links, team.id, isEnabled, getPayload),
    [getPayload, isEnabled, links, team.id]
  )
}
