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
  Template,
  TemplateTagAssignment,
  TemplateTagExistsResult,
  TemplateTagGroup,
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
  getTemplate(templateId: string): Promise<RepoResult<{ template: Template }>>
  getTagGroups(
    templateId: string,
    options?: { assignmentLimit?: number }
  ): Promise<RepoResult<{ tags: TemplateTagGroup[] }>>
  getTagAssignments(
    templateId: string,
    tag: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<
    RepoResult<{
      data: TemplateTagAssignment[]
      nextCursor: string | null
    }>
  >
  checkTagExists(
    templateId: string,
    tag: string
  ): Promise<RepoResult<TemplateTagExistsResult>>
  assignTag(input: {
    templateName: string
    buildId: string
    tag: string
  }): Promise<RepoResult<{ tags: string[]; buildID: string }>>
  deleteTemplate(templateId: string): Promise<RepoResult<{ success: true }>>
  deleteTags(
    templateName: string,
    tags: string[]
  ): Promise<RepoResult<{ success: true }>>
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
      // Filter the list endpoint; infra has no per-template GET that exposes the same shape.
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
    async getTagGroups(templateId, options) {
      if (USE_MOCK_DATA) {
        return ok({ tags: [] })
      }

      const res = await deps.apiClient.GET(
        '/templates/{templateID}/tags/groups',
        {
          params: {
            path: {
              templateID: templateId,
            },
            query: {
              assignmentLimit: options?.assignmentLimit,
            },
          },
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch template tag groups',
            res.error
          )
        )
      }

      return ok({ tags: res.data?.tags ?? [] })
    },
    async getTagAssignments(templateId, tag, options) {
      if (USE_MOCK_DATA) {
        return ok({ data: [], nextCursor: null })
      }

      const res = await deps.apiClient.GET(
        '/templates/{templateID}/tags/{tag}/assignments',
        {
          params: {
            path: {
              templateID: templateId,
              tag,
            },
            query: {
              cursor: options?.cursor,
              limit: options?.limit,
            },
          },
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch template tag assignments',
            res.error
          )
        )
      }

      return ok({
        data: res.data?.data ?? [],
        nextCursor: res.data?.nextCursor ?? null,
      })
    },
    async checkTagExists(templateId, tag) {
      if (USE_MOCK_DATA) {
        return ok({ exists: false, normalizedTag: tag })
      }

      const res = await deps.apiClient.GET(
        '/templates/{templateID}/tags/exists',
        {
          params: {
            path: {
              templateID: templateId,
            },
            query: {
              tag,
            },
          },
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to check template tag existence',
            res.error
          )
        )
      }

      return ok({
        exists: res.data?.exists ?? false,
        normalizedTag: res.data?.normalizedTag ?? tag,
      })
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
    async assignTag({ templateName, buildId, tag }) {
      const res = await deps.infraClient.POST('/templates/tags', {
        body: {
          target: `${templateName}:${buildId}`,
          tags: [tag],
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to assign template tag',
            res.error
          )
        )
      }

      return ok({
        tags: res.data?.tags ?? [tag],
        buildID: res.data?.buildID ?? buildId,
      })
    },
    async deleteTags(templateName, tags) {
      const res = await deps.infraClient.DELETE('/templates/tags', {
        body: {
          name: templateName,
          tags,
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to delete template tags',
            res.error
          )
        )
      }

      return ok({ success: true as const })
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
