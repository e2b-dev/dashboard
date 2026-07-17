'use client'

import {
  filterSidebarLinks,
  type SidebarFeatureFlagId,
  type SidebarNavItem,
} from '@/configs/sidebar'
import { useFeatureFlags } from '@/core/modules/feature-flags/feature-flags.client'

export function useVisibleSidebarLinks(links: SidebarNavItem[]) {
  const { hasPayload, isEnabled } = useFeatureFlags()

  return filterSidebarLinks(links, (flagId: SidebarFeatureFlagId) =>
    flagId === 'byocSetup' ? hasPayload(flagId) : isEnabled(flagId)
  )
}
