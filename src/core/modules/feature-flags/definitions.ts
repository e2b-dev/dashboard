import { z } from 'zod'
import {
  BOOLEAN_FEATURE_FLAGS,
  type BooleanFeatureFlagId,
} from '@/core/modules/feature-flags/boolean-definitions'
import type { FeatureFlagDefinition } from '@/core/modules/feature-flags/types'

export const developmentConnectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  template: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/),
  description: z.string().trim().min(1).max(500),
})

export type DevelopmentConnection = z.infer<typeof developmentConnectionSchema>

export const FEATURE_FLAGS = {
  ...BOOLEAN_FEATURE_FLAGS,
  developmentConnections: {
    kind: 'payload',
    key: 'dev_connections',
    defaultValue: [] as DevelopmentConnection[],
    schema: z.array(developmentConnectionSchema).max(50),
    description:
      'Adds team-targeted development services to the Connections page.',
    exposure: 'server',
  },
} as const satisfies Record<string, FeatureFlagDefinition>

export type FeatureFlagId = keyof typeof FEATURE_FLAGS

export type FeatureFlagIdByKind<Kind extends FeatureFlagDefinition['kind']> = {
  [Id in FeatureFlagId]: (typeof FEATURE_FLAGS)[Id]['kind'] extends Kind
    ? Id
    : never
}[FeatureFlagId]

export type { BooleanFeatureFlagId }
export type PayloadFeatureFlagId = FeatureFlagIdByKind<'payload'>

export type PayloadFeatureFlagValue<Id extends PayloadFeatureFlagId> =
  (typeof FEATURE_FLAGS)[Id]['defaultValue']
