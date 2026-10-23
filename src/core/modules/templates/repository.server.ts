import 'server-only'

import { apiKeyHeaders } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import type {
  DefaultTemplate,
  ListTeamTemplatesOptions,
  ListTeamTemplatesResult,
  Template,
  TemplateDetail,
  TemplateTagAssignment,
  TemplateTagExistsResult,
  TemplateTagGroup,
} from '@/core/modules/templates/models'
import { infra } from '@/core/shared/clients/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type TemplatesRepositoryDeps = {
  infraClient: typeof infra
  apiKeyHeaders: typeof apiKeyHeaders
}

export interface TeamTemplatesRepository {
  getTeamTemplates(): Promise<RepoResult<{ templates: Template[] }>>
  listTeamTemplates(
    options: ListTeamTemplatesOptions
  ): Promise<RepoResult<ListTeamTemplatesResult>>
  getTemplate(
    templateId: string
  ): Promise<RepoResult<{ template: TemplateDetail }>>
  getTagGroups(
    templateId: string,
    options?: {
      assignmentLimit?: number
      tagsLimit?: number
      tagsCursor?: string
      search?: string
      sort?: 'latest_desc' | 'latest_asc' | 'name_asc' | 'name_desc'
    }
  ): Promise<
    RepoResult<{ tags: TemplateTagGroup[]; nextCursor: string | null }>
  >
  getTagCount(templateId: string): Promise<RepoResult<{ total: number }>>
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
  scope: RequestScope,
  deps: TemplatesRepositoryDeps = {
    infraClient: infra,
    apiKeyHeaders: apiKeyHeaders,
  }
): TeamTemplatesRepository {
  return {
    async getTemplate(templateId) {
      const res = await deps.infraClient.GET('/templates/{templateID}', {
        params: {
          path: {
            templateID: templateId,
          },
          // The detail page reads the template, not its builds.
          query: { limit: 1 },
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
        },
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch template',
            res.error
          )
        )
      }

      if (!res.data) {
        return err(
          repoErrorFromHttp(
            404,
            'Template not found in this project',
            undefined
          )
        )
      }

      // api returns names unordered; the list orders them by alias, and the
      // display name takes the first plain name, so sort to match the list.
      return ok({
        template: {
          ...res.data,
          aliases: [...res.data.aliases].sort(),
          names: [...res.data.names].sort(),
        },
      })
    },
    async getTagGroups(templateId, options) {
      const res = await deps.infraClient.GET(
        '/templates/{templateID}/tags/groups',
        {
          params: {
            path: {
              templateID: templateId,
            },
            query: {
              assignmentLimit: options?.assignmentLimit,
              tagsLimit: options?.tagsLimit,
              tagsCursor: options?.tagsCursor,
              search: options?.search,
              sort: options?.sort,
            },
          },
          headers: {
            ...deps.apiKeyHeaders(scope.apiKey),
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

      return ok({
        tags: res.data?.tags ?? [],
        nextCursor: res.data?.nextCursor ?? null,
      })
    },
    async getTagCount(templateId) {
      const res = await deps.infraClient.GET(
        '/templates/{templateID}/tags/count',
        {
          params: {
            path: {
              templateID: templateId,
            },
          },
          headers: {
            ...deps.apiKeyHeaders(scope.apiKey),
          },
        }
      )

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch template tag count',
            res.error
          )
        )
      }

      return ok({ total: res.data?.total ?? 0 })
    },
    async getTagAssignments(templateId, tag, options) {
      const res = await deps.infraClient.GET(
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
            ...deps.apiKeyHeaders(scope.apiKey),
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
      const res = await deps.infraClient.GET(
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
            ...deps.apiKeyHeaders(scope.apiKey),
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
      const res = await deps.infraClient.GET('/templates', {
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
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
        templates: res.data ?? [],
      })
    },
    async listTeamTemplates(options) {
      const res = await deps.infraClient.GET('/unstable/templates/search', {
        params: {
          query: options,
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
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
        lastSpawnedAt: t.lastSpawnedAt ?? null,
        spawnCount: t.spawnCount,
        buildCount: t.buildCount,
        envdVersion: t.envdVersion ?? '',
        ...(t.isDefault && {
          isDefault: true as const,
          defaultDescription: t.description ?? undefined,
        }),
      }))

      return ok({ data, nextCursor: res.data.nextCursor ?? null })
    },
    async assignTag({ templateName, buildId, tag }) {
      const res = await deps.infraClient.POST('/templates/tags', {
        body: {
          target: `${templateName}:${buildId}`,
          tags: [tag],
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
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
          ...deps.apiKeyHeaders(scope.apiKey),
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
          ...deps.apiKeyHeaders(scope.apiKey),
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
          ...deps.apiKeyHeaders(scope.apiKey),
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
  deps: Pick<TemplatesRepositoryDeps, 'infraClient' | 'apiKeyHeaders'> = {
    infraClient: infra,
    apiKeyHeaders: apiKeyHeaders,
  }
): DefaultTemplatesRepository {
  return {
    async getDefaultTemplatesCached() {
      const { data, error, response } = await deps.infraClient.GET(
        '/default-templates',
        {
          headers: deps.apiKeyHeaders(scope.apiKey),
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

      if (!data || data.length === 0) {
        return ok({ templates: [] })
      }

      const templates: DefaultTemplate[] = data.map((t) => ({
        templateID: t.templateID,
        buildID: t.buildID,
        cpuCount: t.cpuCount,
        memoryMB: t.memoryMB,
        diskSizeMB: t.diskSizeMB,
        envdVersion: t.envdVersion,
        public: t.public,
        aliases: t.aliases,
        names: t.names,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        createdBy: null,
        lastSpawnedAt: t.lastSpawnedAt,
        spawnCount: t.spawnCount,
        buildCount: t.buildCount,
        isDefault: true as const,
        defaultDescription: t.description ?? undefined,
      }))

      return ok({ templates })
    },
  }
}
