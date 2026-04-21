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

/** Clamps the offset to a non-negative page start. Example: -20 -> 0. */
const normalizeOffset = (offset: number | null) => Math.max(offset ?? 0, 0)

const useSandboxEventFilters = () => {
  const [filters, setFilters] = useQueryStates(sandboxEventsFilterParams, {
    shallow: true,
  })

  const type = getSandboxLifecycleEventTypeFromUrlValue(filters.type ?? null)
  const offset = normalizeOffset(filters.offset)
  const order = filters.order ?? DEFAULT_SANDBOX_EVENTS_ORDER

  const setType = useCallback(
    (type: SandboxLifecycleEventType | null) => {
      setFilters({
        type: type ? getSandboxLifecycleEventUrlValue(type) : null,
        offset: null,
      })
    },
    [setFilters]
  )

  const setOffset = useCallback(
    (offset: number) => {
      const normalizedOffset = normalizeOffset(offset)
      setFilters({ offset: normalizedOffset === 0 ? null : normalizedOffset })
    },
    [setFilters]
  )

  const setOrder = useCallback(
    (order: SandboxEventsOrder) => {
      setFilters({
        order: order === DEFAULT_SANDBOX_EVENTS_ORDER ? null : order,
        offset: null,
      })
    },
    [setFilters]
  )

  return {
    offset,
    order,
    orderAsc: order === 'asc',
    setOffset,
    setOrder,
    setType,
    type,
  }
}

export default useSandboxEventFilters
