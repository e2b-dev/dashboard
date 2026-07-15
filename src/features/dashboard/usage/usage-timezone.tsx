'use client'

import { parseAsBoolean, parseAsInteger, useQueryStates } from 'nuqs'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import {
  type Timezone,
  TimezoneOverride,
  useTimezone,
} from '@/features/dashboard/timezone'
import { INITIAL_TIMEFRAME_FALLBACK_RANGE_MS } from './constants'
import {
  reanchorTimeframeToTimezone,
  resolveUsageTimezone,
} from './usage-timezone-utils'

interface UsageTimezoneContextValue {
  userTimezone: Timezone
  effectiveTimezone: Timezone
  isPinnedToUtc: boolean
  setPinnedToUtc: (pinned: boolean) => void
}

const UsageTimezoneContext = createContext<UsageTimezoneContextValue | null>(
  null
)

/**
 * Billing meters and invoices are aggregated over UTC boundaries, so the usage
 * page offers a page-scoped UTC pin (via the `utc` query param) that shadows
 * the dashboard timezone preference without persisting anything.
 */
export function UsageTimezoneProvider({ children }: { children: ReactNode }) {
  const { timezone: userTimezone } = useTimezone()

  // `start`/`end` mirror the timeframe params owned by usage-charts-context;
  // sharing one useQueryStates call lets a pin flip re-anchor them atomically.
  const [params, setParams] = useQueryStates(
    {
      utc: parseAsBoolean.withDefault(false),
      start: parseAsInteger,
      end: parseAsInteger,
    },
    { history: 'push', shallow: true }
  )

  const isPinnedToUtc = params.utc

  const setPinnedToUtc = useCallback(
    (pinned: boolean) => {
      void setParams((prev) => {
        const now = Date.now()
        const reanchoredTimeframe = reanchorTimeframeToTimezone(
          {
            start: prev.start ?? now - INITIAL_TIMEFRAME_FALLBACK_RANGE_MS,
            end: prev.end ?? now,
          },
          resolveUsageTimezone(userTimezone, prev.utc),
          resolveUsageTimezone(userTimezone, pinned)
        )

        return {
          utc: pinned || null,
          ...(reanchoredTimeframe ?? {}),
        }
      })
    },
    [userTimezone, setParams]
  )

  const effectiveTimezone = resolveUsageTimezone(userTimezone, isPinnedToUtc)

  const value = useMemo(
    () => ({
      userTimezone,
      effectiveTimezone,
      isPinnedToUtc,
      setPinnedToUtc,
    }),
    [userTimezone, effectiveTimezone, isPinnedToUtc, setPinnedToUtc]
  )

  return (
    <UsageTimezoneContext.Provider value={value}>
      <TimezoneOverride timezone={effectiveTimezone}>
        {children}
      </TimezoneOverride>
    </UsageTimezoneContext.Provider>
  )
}

export function useUsageTimezone() {
  const context = useContext(UsageTimezoneContext)
  if (!context) {
    throw new Error(
      'useUsageTimezone must be used within UsageTimezoneProvider'
    )
  }

  return context
}
