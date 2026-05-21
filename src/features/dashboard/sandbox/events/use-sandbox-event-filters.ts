'use client'

import { useQueryStates } from 'nuqs'
import { useCallback, useMemo } from 'react'
import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  type SandboxEventsOrder,
  sandboxEventsFilterParams,
} from './filter-params'

const DEFAULT_SANDBOX_EVENTS_ORDER: SandboxEventsOrder = 'desc'

export const useSandboxEventFilters = () => {
  const [filters, setFilters] = useQueryStates(sandboxEventsFilterParams, {
    shallow: true,
  })

  const types = useMemo(
    () => filters.types ?? [...SandboxLifecycleEventTypeSchema.options],
    [filters.types]
  )
  const order = filters.order ?? DEFAULT_SANDBOX_EVENTS_ORDER

  const setTypes = useCallback(
    (next: SandboxLifecycleEventType[]) => {
      const isAll =
        next.length === SandboxLifecycleEventTypeSchema.options.length
      setFilters({ types: isAll ? null : next })
    },
    [setFilters]
  )

  const setOrder = useCallback(
    (order: SandboxEventsOrder) => {
      setFilters({
        order: order === DEFAULT_SANDBOX_EVENTS_ORDER ? null : order,
      })
    },
    [setFilters]
  )

  return {
    order,
    orderAsc: order === 'asc',
    setOrder,
    setTypes,
    types,
  }
}
