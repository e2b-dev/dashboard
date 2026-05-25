'use client'

import { useQueryStates } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { INITIAL_BUILD_STATUSES } from '@/core/modules/builds/constants'
import type { BuildStatus } from '@/core/modules/builds/models'
import { templateBuildsFilterParams } from './filter-params'

export default function useFilters() {
  const [filters, setFilters] = useQueryStates(templateBuildsFilterParams, {
    shallow: true,
  })

  const statuses: BuildStatus[] = useMemo(
    () => (filters?.statuses as BuildStatus[] | null) || INITIAL_BUILD_STATUSES,
    [filters.statuses]
  )

  const buildIdOrTemplate = filters?.buildIdOrTemplate ?? undefined

  // Setters write to the URL synchronously. Bursty input (search keystrokes)
  // is debounced at the source via `DebouncedInput`, not here \u2014 so consumers
  // get a stable, predictable setter signature.
  const setStatuses = useCallback(
    (next: BuildStatus[]) => {
      setFilters({ statuses: next })
    },
    [setFilters]
  )

  const setBuildIdOrTemplate = useCallback(
    (next: string) => {
      setFilters({ buildIdOrTemplate: next.length > 0 ? next : null })
    },
    [setFilters]
  )

  return {
    statuses,
    buildIdOrTemplate,
    setStatuses,
    setBuildIdOrTemplate,
  }
}
