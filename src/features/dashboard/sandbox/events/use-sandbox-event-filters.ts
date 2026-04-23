'use client'

import { useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import {
  getSandboxLifecycleEventTypeFromUrlValue,
  getSandboxLifecycleEventUrlValue,
  type SandboxLifecycleEventType,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  type SandboxEventsOrder,
  sandboxEventsFilterParams,
} from './filter-params'

const DEFAULT_SANDBOX_EVENTS_ORDER: SandboxEventsOrder = 'desc'

const useSandboxEventFilters = () => {
  const [filters, setFilters] = useQueryStates(sandboxEventsFilterParams, {
    shallow: true,
  })

  const type = getSandboxLifecycleEventTypeFromUrlValue(filters.type ?? null)
  const order = filters.order ?? DEFAULT_SANDBOX_EVENTS_ORDER

  const setType = useCallback(
    (type: SandboxLifecycleEventType | null) => {
      setFilters({
        type: type ? getSandboxLifecycleEventUrlValue(type) : null,
      })
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
    setType,
    type,
  }
}

export default useSandboxEventFilters
