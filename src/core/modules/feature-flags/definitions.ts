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

const gcpRegionSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{2,62}$/)

const byocSetupTemplateSchema = z.string().trim().min(1).max(50_000)

export const byocSetupSchema = z.object({
  enabled: z.literal(true),
  principal: z
    .string()
    .trim()
    .regex(
      /^serviceAccount:[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/
    ),
  regions: z
    .array(gcpRegionSchema)
    .min(1)
    .max(20)
    .refine((regions) => new Set(regions).size === regions.length),
  templates: z.object({
    gcloud: byocSetupTemplateSchema,
    terraform: byocSetupTemplateSchema,
  }),
})

export type ByocSetupConfig = z.infer<typeof byocSetupSchema>
export type ByocSetupValue = ByocSetupConfig | { enabled: false }

export const FEATURE_FLAGS = {
  ...BOOLEAN_FEATURE_FLAGS,
  byocSetup: {
    kind: 'payload',
    key: 'byoc_setup',
    defaultValue: { enabled: false } as ByocSetupValue,
    schema: z.discriminatedUnion('enabled', [
      z.object({ enabled: z.literal(false) }),
      byocSetupSchema,
    ]),
    description: 'Configures team-targeted BYOC onboarding.',
    exposure: 'both',
  },
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
