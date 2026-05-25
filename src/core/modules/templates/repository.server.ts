import 'server-only'

import { authHeaders } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import type {
  DefaultTemplate,
  ListTeamTemplatesOptions,
  ListTeamTemplatesResult,
  Template,
  TemplateTag,
} from '@/core/modules/templates/models'
import {
  type AuthUserEmailResolver,
  getAuthUserEmailsById,
  resolveCreatorEmails,
} from '@/core/modules/users/auth-user-emails.server'
import { api, infra } from '@/core/shared/clients/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type {
  RequestScope,
  TeamRequestScope,
} from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type TemplatesRepositoryDeps = {
  apiClient: typeof api
  infraClient: typeof infra
  authHeaders: typeof authHeaders
  resolveAuthUserEmailsById: AuthUserEmailResolver
}

export interface TeamTemplatesRepository {
  getTeamTemplates(): Promise<RepoResult<{ templates: Template[] }>>
  listTeamTemplates(
    options: ListTeamTemplatesOptions
  ): Promise<RepoResult<ListTeamTemplatesResult>>
  getTemplate(templateId: string): Promise<RepoResult<{ template: Template }>>
  getTags(templateId: string): Promise<RepoResult<{ tags: TemplateTag[] }>>
  deleteTemplate(templateId: string): Promise<RepoResult<{ success: true }>>
  updateTemplateVisibility(
    templateId: string,
    isPublic: boolean
  ): Promise<RepoResult<{ success: true; public: boolean }>>
}

export interface DefaultTemplatesRepository {
  getDefaultTemplatesCached(): Promise<
    RepoResult<{ templates: DefaultTemplate[] }>
  >
}

export function createTemplatesRepository(
  scope: TeamRequestScope,
  deps: TemplatesRepositoryDeps = {
    apiClient: api,
    infraClient: infra,
    authHeaders: authHeaders,
    resolveAuthUserEmailsById: getAuthUserEmailsById,
  }
): TeamTemplatesRepository {
  return {
    async getTemplate(templateId) {
      // v1: filter server-side over the existing list endpoint. No
      // separate per-template fetch needed; this keeps the cache hot
      // for cross-page reuse and avoids any new infra dependencies.
      const listResult = await this.getTeamTemplates()
      if (!listResult.ok) return listResult

      const template = listResult.data.templates.find(
        (t) => t.templateID === templateId
      )

      if (!template) {
        return err(
          repoErrorFromHttp(404, 'Template not found in this team', undefined)
        )
      }

      return ok({ template })
    },
    async getTags(templateId) {
      if (USE_MOCK_DATA) {
        return ok({ tags: [] })
      }

      const res = await deps.infraClient.GET('/templates/{templateID}/tags', {
        params: {
          path: {
            templateID: templateId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch template tags',
            res.error
          )
        )
      }

      return ok({ tags: res.data ?? [] })
    },
    async getTeamTemplates() {
      if (USE_MOCK_DATA) {
        return ok({
          templates: MOCK_TEMPLATES_DATA,
        })
      }
      const res = await deps.infraClient.GET('/templates', {
        params: {
          query: {
            teamID: scope.teamId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch templates',
            res.error
          )
        )
      }

      return ok({
        templates: await resolveCreatorEmails(
          res.data ?? [],
          deps.resolveAuthUserEmailsById
        ),
      })
    },
    async listTeamTemplates(options) {
      if (USE_MOCK_DATA) {
        return ok({ data: MOCK_TEMPLATES_DATA, nextCursor: null })
      }

      const res = await deps.apiClient.GET('/templates', {
        params: {
          query: options,
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch templates',
            res.error
          )
        )
      }

      if (!res.data?.data?.length) {
        return ok({ data: [], nextCursor: res.data?.nextCursor ?? null })
      }

      const data = res.data.data.map((t): Template | DefaultTemplate => ({
        templateID: t.templateID,
        buildID: t.buildID,
        cpuCount: t.cpuCount,
        memoryMB: t.memoryMB,
        diskSizeMB: t.diskSizeMB ?? 0,
        public: t.public,
        aliases: t.aliases,
        names: t.names,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // Email resolution is deferred while the Supabase auth migration is
        // in progress; the endpoint returns only the creator id for now.
        createdBy: t.createdBy
          ? { id: t.createdBy.id, email: t.createdBy.email ?? '' }
          : null,
        lastSpawnedAt: t.lastSpawnedAt ?? null,
        spawnCount: t.spawnCount,
        buildCount: t.buildCount,
        envdVersion: t.envdVersion ?? '',
        ...(t.isDefault && {
          isDefault: true as const,
          defaultDescription: t.defaultDescription ?? undefined,
        }),
      }))

      return ok({ data, nextCursor: res.data.nextCursor ?? null })
    },
    async deleteTemplate(templateId) {
      const res = await deps.infraClient.DELETE('/templates/{templateID}', {
        params: {
          path: {
            templateID: templateId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to delete template',
            res.error
          )
        )
      }

      return ok({ success: true as const })
    },
    async updateTemplateVisibility(templateId, isPublic) {
      const res = await deps.infraClient.PATCH('/v2/templates/{templateID}', {
        body: {
          public: isPublic,
        },
        params: {
          path: {
            templateID: templateId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to update template',
            res.error
          )
        )
      }

      return ok({ success: true as const, public: isPublic })
    },
  }
}

export function createDefaultTemplatesRepository(
  scope: RequestScope,
  deps: Pick<TemplatesRepositoryDeps, 'apiClient' | 'authHeaders'> = {
    apiClient: api,
    authHeaders: authHeaders,
  }
): DefaultTemplatesRepository {
  return {
    async getDefaultTemplatesCached() {
      if (USE_MOCK_DATA) {
        return ok({
          templates: MOCK_DEFAULT_TEMPLATES_DATA,
        })
      }

      const { data, error, response } = await deps.apiClient.GET(
        '/templates/defaults',
        {
          headers: deps.authHeaders(scope.accessToken),
          next: { tags: [CACHE_TAGS.DEFAULT_TEMPLATES] },
        }
      )

      if (!response.ok || error) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to fetch default templates',
            error
          )
        )
      }

      if (!data?.templates || data.templates.length === 0) {
        return ok({ templates: [] })
      }

      const templates: DefaultTemplate[] = data.templates.map((t) => ({
        templateID: t.id,
        buildID: t.buildId,
        cpuCount: t.vcpu,
        memoryMB: t.ramMb,
        diskSizeMB: t.totalDiskSizeMb ?? 0,
        envdVersion: t.envdVersion ?? '',
        public: t.public,
        aliases: t.aliases.map((a) => a.alias),
        names: t.aliases.map((a) => {
          if (a.namespace && a.namespace.length > 0) {
            return `${a.namespace}/${a.alias}`
          }
          return a.alias
        }),
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
        createdBy: null,
        lastSpawnedAt: t.createdAt,
        spawnCount: t.spawnCount,
        buildCount: t.buildCount,
        isDefault: true as const,
      }))

      return ok({ templates })
    },
  }
}
