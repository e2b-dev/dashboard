import { describe, expect, it, vi } from 'vitest'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'

const scope = { apiKey: 'e2b_test_api_key' }

function ok<T>(data: T) {
  return { data, error: null, response: { ok: true, status: 200 } }
}

function repoWithGet(get: ReturnType<typeof vi.fn>) {
  return createTemplatesRepository(scope, {
    infraClient: {
      GET: get,
      POST: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    } as unknown as Parameters<
      typeof createTemplatesRepository
    >[1]['infraClient'],
    apiKeyHeaders: vi.fn(() => ({ 'X-API-Key': 'e2b_test_api_key' })),
  })
}

const template = {
  templateID: 'tpl',
  buildID: '11111111-1111-1111-1111-111111111111',
  cpuCount: 2,
  memoryMB: 512,
  diskSizeMB: 1024,
  public: false,
  aliases: ['base'],
  names: ['acme/base'],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  lastSpawnedAt: null,
  spawnCount: 3,
  buildCount: 4,
  envdVersion: '0.2.0',
  buildStatus: 'ready',
}

describe('template reads through api', () => {
  it('reads the template detail from api without its builds', async () => {
    const get = vi.fn().mockResolvedValue(ok({ ...template, builds: [] }))
    const result = await repoWithGet(get).getTemplate('tpl')

    expect(get).toHaveBeenCalledWith(
      '/templates/{templateID}',
      expect.objectContaining({
        params: { path: { templateID: 'tpl' }, query: { limit: 1 } },
      })
    )
    expect(result).toEqual({
      ok: true,
      data: {
        template: expect.objectContaining({
          buildID: template.buildID,
          cpuCount: 2,
          memoryMB: 512,
          diskSizeMB: 1024,
          envdVersion: '0.2.0',
          buildCount: 4,
        }),
      },
    })
  })

  it('orders the detail names by alias, as the list does', async () => {
    const get = vi.fn().mockResolvedValue(
      ok({
        ...template,
        aliases: ['web', 'api'],
        names: ['web', 'acme/api'],
        builds: [],
      })
    )
    const result = await repoWithGet(get).getTemplate('tpl')

    expect(result.ok && result.data.template.aliases).toEqual(['api', 'web'])
    expect(result.ok && result.data.template.names).toEqual(['acme/api', 'web'])
  })

  it('lists templates through the template search', async () => {
    const get = vi.fn().mockResolvedValue(
      ok({
        data: [
          {
            ...template,
            isDefault: true,
            description: 'A base sandbox',
          },
        ],
        nextCursor: 'created_at_desc|2026-10-01T00:00:00Z|tpl',
      })
    )
    const options = { search: 'base', sort: 'updated_at_desc' as const }
    const result = await repoWithGet(get).listTeamTemplates(options)

    expect(get).toHaveBeenCalledWith(
      '/unstable/templates/search',
      expect.objectContaining({ params: { query: options } })
    )
    expect(result).toEqual({
      ok: true,
      data: {
        data: [
          expect.objectContaining({
            templateID: 'tpl',
            isDefault: true,
            defaultDescription: 'A base sandbox',
          }),
        ],
        nextCursor: 'created_at_desc|2026-10-01T00:00:00Z|tpl',
      },
    })
  })

  it('reads tag groups from api', async () => {
    const get = vi.fn().mockResolvedValue(ok({ tags: [], nextCursor: null }))
    await repoWithGet(get).getTagGroups('tpl', { tagsLimit: 10 })

    expect(get).toHaveBeenCalledWith(
      '/templates/{templateID}/tags/groups',
      expect.objectContaining({
        params: expect.objectContaining({ path: { templateID: 'tpl' } }),
      })
    )
  })

  it('maps the default templates from api', async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ok([{ ...template, isDefault: true, description: 'A base sandbox' }])
      )
    const repository = createDefaultTemplatesRepository(scope, {
      infraClient: { GET: get } as unknown as Parameters<
        typeof createDefaultTemplatesRepository
      >[1]['infraClient'],
      apiKeyHeaders: vi.fn(() => ({ 'X-API-Key': 'e2b_test_api_key' })),
    })

    const result = await repository.getDefaultTemplatesCached()

    expect(result).toEqual({
      ok: true,
      data: {
        templates: [
          expect.objectContaining({
            templateID: 'tpl',
            names: ['acme/base'],
            aliases: ['base'],
            isDefault: true,
            defaultDescription: 'A base sandbox',
          }),
        ],
      },
    })
  })
})
