'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import {
  type BooleanFeatureFlagId,
  FEATURE_FLAGS,
  type PayloadFeatureFlagId,
} from '@/core/modules/feature-flags/definitions'
import type { EvaluatedFeatureFlag } from '@/core/modules/feature-flags/types'

type FeatureFlagsContextValue = {
  flags: EvaluatedFeatureFlag[]
  getPayload<Id extends PayloadFeatureFlagId>(
    flagId: Id
  ): (typeof FEATURE_FLAGS)[Id]['defaultValue']
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

      return FEATURE_FLAGS[flagId].defaultValue
    },
    [flagsById]
  )

  const value = useMemo(
    () => ({
      flags: initialFlags,
      getPayload<Id extends PayloadFeatureFlagId>(flagId: Id) {
        const evaluatedFlag = flagsById.get(flagId)

        return (evaluatedFlag?.value ??
          FEATURE_FLAGS[flagId]
            .defaultValue) as (typeof FEATURE_FLAGS)[Id]['defaultValue']
      },
      isEnabled,
    }),
    [flagsById, initialFlags, isEnabled]
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

export function useFeatureFlagPayload<Id extends PayloadFeatureFlagId>(
  flagId: Id
) {
  return useFeatureFlags().getPayload(flagId)
}
