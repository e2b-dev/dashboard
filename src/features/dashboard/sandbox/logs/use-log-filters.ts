'use client'

import { useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import {
  type LogLevelFilter,
  sandboxLogsFilterParams,
} from './logs-filter-params'

export default function useLogFilters() {
  const [filters, setFilters] = useQueryStates(sandboxLogsFilterParams, {
    shallow: true,
  })

  const level = filters.level as LogLevelFilter | null
  const search = filters.search ?? ''

  const setLevel = useCallback(
    (level: LogLevelFilter | null) => {
      setFilters({ level })
    },
    [setFilters]
  )

  const setSearch = useCallback(
    (search: string) => {
      setFilters({ search: search || null })
    },
    [setFilters]
  )

  return {
    level,
    search,
    setLevel,
    setSearch,
  }
}
