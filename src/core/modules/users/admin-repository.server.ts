import 'server-only'

import { ADMIN_AUTH_HEADERS } from '@/configs/api'
import type { ResolvedTeam } from '@/core/modules/teams/models'
import { api } from '@/core/shared/clients/api'
import type { components as DashboardApiComponents } from '@/core/shared/contracts/dashboard-api.types'
import { repoErrorFromHttp } from '@/core/shared/errors'
import { err, ok, type RepoResult } from '@/core/shared/result'

export type AdminAuthProviderUserBootstrapRequest =
  DashboardApiComponents['schemas']['AdminAuthProviderUserBootstrapRequest']

type AdminUsersRepositoryDeps = {
  apiClient: typeof api
  adminHeaders: typeof ADMIN_AUTH_HEADERS
  adminToken?: string
}

export interface AdminUsersRepository {
  bootstrapAuthProviderUser(
    body: AdminAuthProviderUserBootstrapRequest
  ): Promise<RepoResult<ResolvedTeam>>
}

export function createAdminUsersRepository(
  deps: AdminUsersRepositoryDeps = {
    apiClient: api,
    adminHeaders: ADMIN_AUTH_HEADERS,
    adminToken: process.env.DASHBOARD_API_ADMIN_TOKEN,
  }
): AdminUsersRepository {
  return {
    async bootstrapAuthProviderUser(body) {
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
        '/admin/users/bootstrap',
        {
          body,
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
