'use client'

import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import {
  ALL_LOG_LEVELS,
  buildLogsFilterParams,
  LogLevelFilter,
} from './logs-filter-params'

export default function useLogFilters() {
  const [filters, setFilters] = useQueryStates(buildLogsFilterParams, {
    shallow: true,
  })

  const levels: LogLevelFilter[] = useMemo(
    () => (filters?.levels as LogLevelFilter[] | null) || ALL_LOG_LEVELS,
    [filters.levels]
  )

  const setLevels = useDebounceCallback((levels: LogLevelFilter[]) => {
    setFilters({ levels })
  }, 300)

  return {
    levels,
    setLevels,
  }
}
