'use client'

import { BuildStatus } from '@/server/api/models/builds.models'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { INITIAL_BUILD_STATUSES } from './constants'
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

  const setStatuses = useDebounceCallback((statuses: BuildStatus[]) => {
    setFilters({ statuses: statuses })
  }, 500)

  const setBuildIdOrTemplate = useDebounceCallback(
    (buildIdOrTemplate: string) => {
      setFilters({ buildIdOrTemplate })
    },
    500
  )

  return {
    statuses,
    buildIdOrTemplate,
    setStatuses,
    setBuildIdOrTemplate,
  }
}
