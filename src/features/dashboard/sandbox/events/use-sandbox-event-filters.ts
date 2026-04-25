'use client'

import { useQueryStates } from 'nuqs'
import { useCallback } from 'react'
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

// Re-adds the "sandbox.lifecycle." prefix from a URL value, e.g. "created" -> "sandbox.lifecycle.created"
const fromUrlValue = (
  value: string | null
): SandboxLifecycleEventType | null => {
  if (!value) return null
  const parsed = SandboxLifecycleEventTypeSchema.safeParse(
    `sandbox.lifecycle.${value}`
  )
  return parsed.success ? parsed.data : null
}

const useSandboxEventFilters = () => {
  const [filters, setFilters] = useQueryStates(sandboxEventsFilterParams, {
    shallow: true,
  })

  const type = fromUrlValue(filters.type)
  const order = filters.order ?? DEFAULT_SANDBOX_EVENTS_ORDER

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

export default useSandboxEventFilters
