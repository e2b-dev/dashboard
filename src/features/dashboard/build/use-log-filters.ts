'use client'

import { useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import {
  buildLogsFilterParams,
  type LogLevelFilter,
} from './logs-filter-params'

export default function useLogFilters() {
  const [filters, setFilters] = useQueryStates(buildLogsFilterParams, {
    shallow: true,
  })

  const level = filters.level as LogLevelFilter | null

  const setLevel = useCallback(
    (level: LogLevelFilter | null) => {
      setFilters({ level })
    },
    [setFilters]
  )

  return {
    level,
    setLevel,
  }
}
