'use client'

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs'
import { useCallback, useMemo } from 'react'
import { INITIAL_BUILD_STATUSES } from '@/core/modules/builds/constants'
import type { BuildStatus } from '@/core/modules/builds/models'

/**
 * Variant of `useFilters` scoped to a single template's builds tab.
 *
 * URL state:
 *  - `statuses` — build status filter, same as the all-team page
 *  - `q` — free-text search applied client-side against build IDs.
 *    Backend scoping by templateID stays authoritative; `q` only
 *    narrows the already-loaded result set.
 */
const templateScopedFilterParams = {
  statuses: parseAsArrayOf(
    parseAsStringEnum<BuildStatus>(['building', 'failed', 'success'])
  ),
  q: parseAsString,
}

export default function useTemplateBuildsFilters() {
  const [filters, setFilters] = useQueryStates(templateScopedFilterParams, {
    shallow: true,
  })

  const statuses: BuildStatus[] = useMemo(
    () => filters?.statuses ?? INITIAL_BUILD_STATUSES,
    [filters.statuses]
  )

  const q = filters?.q ?? undefined

  const setStatuses = useCallback(
    (next: BuildStatus[]) => {
      setFilters({ statuses: next })
    },
    [setFilters]
  )

  const setQ = useCallback(
    (next: string) => {
      setFilters({ q: next.length > 0 ? next : null })
    },
    [setFilters]
  )

  return { statuses, setStatuses, q, setQ }
}
