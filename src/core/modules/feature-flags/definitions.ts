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
  blockLegacyCliAuth: {
    kind: 'boolean',
    key: 'block_legacy_cli_auth',
    defaultValue: false,
    description:
      'Blocks the legacy e2b access token CLI auth flow. When enabled, old CLI versions see an upgrade prompt instead.',
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
