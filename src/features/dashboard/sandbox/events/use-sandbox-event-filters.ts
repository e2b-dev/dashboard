'use client'

import { useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo } from 'react'
import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  type SandboxEventsOrder,
  sandboxEventsFilterParams,
} from './filter-params'

const DEFAULT_SANDBOX_EVENTS_ORDER: SandboxEventsOrder = 'desc'

// Strips the "sandbox.lifecycle." prefix for URL display, e.g. "sandbox.lifecycle.created" -> "created"
const toUrlValue = (type: SandboxLifecycleEventType) =>
  type.split('.').slice(2).join('.')

export const useSandboxEventFilters = () => {
  const [filters, setFilters] = useQueryStates(sandboxEventsFilterParams, {
    shallow: true,
  })

  const parsedType = useMemo(() => {
    if (!filters.type) return null

    return SandboxLifecycleEventTypeSchema.safeParse(
      `sandbox.lifecycle.${filters.type}`
    )
  }, [filters.type])
  const type = parsedType?.success ? parsedType.data : null
  const order = filters.order ?? DEFAULT_SANDBOX_EVENTS_ORDER

  useEffect(() => {
    if (parsedType && !parsedType.success) setFilters({ type: null })
  }, [parsedType, setFilters])

  const setType = useCallback(
    (type: SandboxLifecycleEventType | null) => {
      setFilters({ type: type ? toUrlValue(type) : null })
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
