import 'server-only'

import { ADMIN_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import type { ResolvedTeam } from '@/core/modules/teams/models'
import { repoErrorFromHttp } from '@/core/shared/errors'
import { err, ok, type RepoResult } from '@/core/shared/result'

type AdminUsersRepositoryDeps = {
  apiClient: typeof api
  adminHeaders: typeof ADMIN_AUTH_HEADERS
  adminToken?: string
}

export interface AdminUsersRepository {
  bootstrapUser(userId: string): Promise<RepoResult<ResolvedTeam>>
}

export function createAdminUsersRepository(
  deps: AdminUsersRepositoryDeps = {
    apiClient: api,
    adminHeaders: ADMIN_AUTH_HEADERS,
    adminToken: process.env.DASHBOARD_API_ADMIN_TOKEN,
  }
): AdminUsersRepository {
  return {
    async bootstrapUser(userId) {
      if (!deps.adminToken) {
        return err(
          repoErrorFromHttp(
            500,
            'DASHBOARD_API_ADMIN_TOKEN is not configured',
            new Error('DASHBOARD_API_ADMIN_TOKEN is not configured')
          )
        )
      }

      const { data, error, response } = await deps.apiClient.POST(
        '/admin/users/{userId}/bootstrap',
        {
          params: {
            path: {
              userId,
            },
          },
          headers: deps.adminHeaders(deps.adminToken),
        }
      )

      if (!response.ok || error || !data) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to bootstrap user',
            error
          )
        )
      }

      return ok({
        id: data.id,
        slug: data.slug,
      })
    },
  }
}
