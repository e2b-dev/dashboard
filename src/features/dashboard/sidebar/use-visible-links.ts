'use client'

import { useMemo } from 'react'
import { filterSidebarLinks, type SidebarNavItem } from '@/configs/sidebar'
import { useFeatureFlags } from '@/core/modules/feature-flags/feature-flags.client'

export function useVisibleSidebarLinks(links: SidebarNavItem[]) {
  const { isEnabled } = useFeatureFlags()

  return useMemo(() => filterSidebarLinks(links, isEnabled), [isEnabled, links])
}
