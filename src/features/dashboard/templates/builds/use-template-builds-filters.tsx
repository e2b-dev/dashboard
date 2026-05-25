'use client'

import { parseAsArrayOf, parseAsStringEnum, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { INITIAL_BUILD_STATUSES } from '@/core/modules/builds/constants'
import type { BuildStatus } from '@/core/modules/builds/models'

/**
 * Variant of `useFilters` that manages only the `statuses` URL param.
 * Used on the per-template detail builds tab where the builds list is
 * already scoped by `templateId` (passed as a prop), so a search input
 * for templateId/name would be redundant.
 */
const templateScopedFilterParams = {
  statuses: parseAsArrayOf(
    parseAsStringEnum<BuildStatus>(['building', 'failed', 'success'])
  ),
}

export default function useTemplateBuildsFilters() {
  const [filters, setFilters] = useQueryStates(templateScopedFilterParams, {
    shallow: true,
  })

  const statuses: BuildStatus[] = useMemo(
    () => filters?.statuses ?? INITIAL_BUILD_STATUSES,
    [filters.statuses]
  )

  const setStatuses = useDebounceCallback((next: BuildStatus[]) => {
    setFilters({ statuses: next })
  }, 300)

  return { statuses, setStatuses }
}
