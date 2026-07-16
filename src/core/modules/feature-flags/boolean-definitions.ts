import type { BooleanFeatureFlagDefinition } from '@/core/modules/feature-flags/types'

export const BOOLEAN_FEATURE_FLAGS = {
  agentsEnabled: {
    kind: 'boolean',
    key: 'agents_enabled',
    defaultValue: false,
    description: 'Enables the dashboard agents launcher.',
    exposure: 'both',
  },
  byocEnabled: {
    kind: 'boolean',
    key: 'byoc_enabled',
    defaultValue: false,
    description: 'Enables the dashboard BYOC page.',
    exposure: 'both',
  },
  connectionsEnabled: {
    kind: 'boolean',
    key: 'connections_enabled',
    defaultValue: false,
    description: 'Enables the dashboard connections page.',
    exposure: 'both',
  },
  isAdmin: {
    kind: 'boolean',
    key: 'is_admin',
    defaultValue: false,
    description: 'Enables dashboard admin-only surfaces.',
    exposure: 'server',
  },
  newSandboxList: {
    kind: 'boolean',
    key: 'new_sandbox_list',
    defaultValue: false,
    description:
      'Enables the new sandbox list with pagination and paused sandbox coverage.',
    exposure: 'both',
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
    exposure: 'both',
  },
} as const satisfies Record<string, BooleanFeatureFlagDefinition>

export type BooleanFeatureFlagId = keyof typeof BOOLEAN_FEATURE_FLAGS
