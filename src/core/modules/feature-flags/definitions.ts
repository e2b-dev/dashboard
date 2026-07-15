import type { FeatureFlagDefinition } from '@/core/modules/feature-flags/types'

export const FEATURE_FLAGS = {
  agentsEnabled: {
    kind: 'boolean',
    key: 'agents_enabled',
    defaultValue: false,
    description: 'Enables the dashboard agents launcher.',
    exposure: 'server',
  },
  isAdmin: {
    kind: 'boolean',
    key: 'is_admin',
    defaultValue: false,
    description: 'Enables dashboard admin-only surfaces.',
    exposure: 'server',
  },
  newUsagePage: {
    kind: 'boolean',
    key: 'new-usage-page',
    defaultValue: false,
    description: 'Enables the redesigned (Dashboard 2.0) usage page skeleton.',
    exposure: 'server',
  },
  disableE2BAccessTokenProvisioning: {
    kind: 'boolean',
    key: 'disable_e2b_access_token_provisioning',
    defaultValue: false,
    description:
      'Disables provisioning of e2b access tokens via generateE2BUserAccessToken. When enabled, the legacy CLI flow shows an upgrade prompt and the createAccessToken tRPC mutation returns an error.',
    exposure: 'server',
  },
} as const satisfies Record<string, FeatureFlagDefinition>

export type FeatureFlagId = keyof typeof FEATURE_FLAGS

export type FeatureFlagIdByKind<Kind extends FeatureFlagDefinition['kind']> = {
  [Id in FeatureFlagId]: (typeof FEATURE_FLAGS)[Id]['kind'] extends Kind
    ? Id
    : never
}[FeatureFlagId]

export type BooleanFeatureFlagId = FeatureFlagIdByKind<'boolean'>
export type PayloadFeatureFlagId = FeatureFlagIdByKind<'payload'>
