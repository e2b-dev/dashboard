import type { z } from 'zod'

export type FeatureFlagExposure = 'server' | 'client' | 'both'

type BaseFeatureFlagDefinition = {
  key: string
  defaultValue: unknown
  description?: string
  exposure?: FeatureFlagExposure
}

export type BooleanFeatureFlagDefinition = BaseFeatureFlagDefinition & {
  kind: 'boolean'
  defaultValue: boolean
}

export type PayloadFeatureFlagDefinition<T> = BaseFeatureFlagDefinition & {
  kind: 'payload'
  defaultValue: T
  schema: z.ZodType<T>
}

export type FeatureFlagDefinition =
  | BooleanFeatureFlagDefinition
  | PayloadFeatureFlagDefinition<unknown>

export type EvaluatedFeatureFlag = {
  id: string
  key: string
  kind: FeatureFlagDefinition['kind']
  value: unknown
  defaultValue: unknown
  description?: string
}
