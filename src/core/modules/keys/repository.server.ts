import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/core/shared/clients/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import type { CreatedTeamAPIKey, TeamAPIKey } from '@/types/api.types'

type KeysRepositoryDeps = {
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type KeysScope = TeamRequestScope

export interface KeysRepository {
  listTeamApiKeys(): Promise<RepoResult<TeamAPIKey[]>>
  createApiKey(name: string): Promise<RepoResult<CreatedTeamAPIKey>>
  deleteApiKey(apiKeyId: string): Promise<RepoResult<void>>
}

export function createKeysRepository(
  scope: KeysScope,
  deps: KeysRepositoryDeps = {
    infraClient: infra,
    authHeaders: SUPABASE_AUTH_HEADERS,
  }
): KeysRepository {
  return {
    async listTeamApiKeys() {
      const res = await deps.infraClient.GET('/api-keys', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to get API keys',
            res.error
          )
        )
      }

      return ok(res.data ?? [])
    },
    async createApiKey(name) {
      const res = await deps.infraClient.POST('/api-keys', {
        body: {
          name,
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to create API key',
            res.error
          )
        )
      }

      return ok(res.data)
    },
    async deleteApiKey(apiKeyId) {
      const res = await deps.infraClient.DELETE('/api-keys/{apiKeyID}', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        params: {
          path: {
            apiKeyID: apiKeyId,
          },
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to delete API key',
            res.error
          )
        )
      }

      return ok(undefined)
    },
  }
}
