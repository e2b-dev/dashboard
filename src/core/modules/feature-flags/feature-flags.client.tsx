'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import {
  BOOLEAN_FEATURE_FLAGS,
  type BooleanFeatureFlagId,
} from '@/core/modules/feature-flags/boolean-definitions'
import type { EvaluatedFeatureFlag } from '@/core/modules/feature-flags/types'

type FeatureFlagsContextValue = {
  flags: EvaluatedFeatureFlag[]
  isEnabled(flagId: BooleanFeatureFlagId): boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(
  undefined
)

export function FeatureFlagsProvider({
  children,
  initialFlags,
}: {
  children: ReactNode
  initialFlags: EvaluatedFeatureFlag[]
}) {
  const flagsById = useMemo(
    () => new Map(initialFlags.map((flag) => [flag.id, flag])),
    [initialFlags]
  )

  const isEnabled = useCallback(
    (flagId: BooleanFeatureFlagId) => {
      const evaluatedFlag = flagsById.get(flagId)

      if (typeof evaluatedFlag?.value === 'boolean') {
        return evaluatedFlag.value
      }

      return BOOLEAN_FEATURE_FLAGS[flagId].defaultValue
    },
    [flagsById]
  )

  const value = useMemo(
    () => ({ flags: initialFlags, isEnabled }),
    [initialFlags, isEnabled]
  )

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)

  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider')
  }

  return context
}

export function useFeatureFlag(flagId: BooleanFeatureFlagId) {
  return useFeatureFlags().isEnabled(flagId)
}
