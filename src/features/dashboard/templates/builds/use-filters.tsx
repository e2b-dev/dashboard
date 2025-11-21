'use client'

import { BuildStatusDTO } from '@/server/api/models/builds.models'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { INITIAL_BUILD_STATUSES } from './constants'
import { templateBuildsFilterParams } from './filter-params'

export default function useFilters() {
  const [filters, setFilters] = useQueryStates(templateBuildsFilterParams, {
    shallow: true,
  })

  const statuses: BuildStatusDTO[] = useMemo(
    () =>
      (filters?.statuses as BuildStatusDTO[] | null) || INITIAL_BUILD_STATUSES,
    [filters.statuses]
  )

  const buildIdOrTemplate = filters?.buildIdOrTemplate ?? undefined

  const setStatuses = useDebounceCallback((statuses: BuildStatusDTO[]) => {
    setFilters({ statuses: statuses })
  }, 300)

  const setBuildIdOrTemplate = useDebounceCallback(
    (buildIdOrTemplate: string) => {
      setFilters({ buildIdOrTemplate })
    },
    300
  )

  return {
    statuses,
    buildIdOrTemplate,
    setStatuses,
    setBuildIdOrTemplate,
  }
}
