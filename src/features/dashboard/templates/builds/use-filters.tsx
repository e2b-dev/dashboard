'use client'

import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
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
  const cpuCount = filters.cpuCount ?? undefined
  const memoryMB = filters.memoryMB ?? undefined

  const setStatuses = useDebounceCallback((statuses: BuildStatus[]) => {
    setFilters({ statuses: statuses })
  }, 300)

  const setBuildIdOrTemplate = useDebounceCallback(
    (buildIdOrTemplate: string) => {
      setFilters({ buildIdOrTemplate })
    },
    300
  )

  const setResources = useDebounceCallback(
    (resources: { cpuCount?: number; memoryMB?: number }) => {
      setFilters({
        cpuCount: resources.cpuCount ?? null,
        memoryMB: resources.memoryMB ?? null,
      })
    },
    300
  )

  return {
    statuses,
    buildIdOrTemplate,
    cpuCount,
    memoryMB,
    setStatuses,
    setBuildIdOrTemplate,
    setResources,
  }
}
