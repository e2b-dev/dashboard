import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type {
  BooleanFeatureFlagDefinition,
  JsonFeatureFlagDefinition,
} from '@/configs/flags'
import { createFeatureFlagService } from '@/core/server/feature-flags/flags.server'

const context = {
  userId: 'user-id',
  teamId: 'team-id',
}

describe('createFeatureFlagService', () => {
  it('returns boolean values from the provider', async () => {
    const flag = {
      kind: 'boolean',
      key: 'test-boolean',
      defaultValue: false,
    } satisfies BooleanFeatureFlagDefinition
    const provider = {
      getBoolean: vi.fn().mockResolvedValue(true),
      getJson: vi.fn(),
    }

    const result = await createFeatureFlagService(provider).getBoolean(
      flag,
      context
    )

    expect(result).toBe(true)
    expect(provider.getBoolean).toHaveBeenCalledWith(flag, context)
  })

  it('parses JSON flag values through the flag definition schema', async () => {
    const flag = {
      kind: 'json',
      key: 'test-json',
      defaultValue: [],
      schema: z.array(z.object({ name: z.string() })),
    } satisfies JsonFeatureFlagDefinition<{ name: string }[]>
    const provider = {
      getBoolean: vi.fn(),
      getJson: vi.fn().mockResolvedValue([{ name: 'Codex' }]),
    }

    const result = await createFeatureFlagService(provider).getJson(
      flag,
      context
    )

    expect(result).toEqual([{ name: 'Codex' }])
    expect(provider.getJson).toHaveBeenCalledWith(flag, context)
  })

  it('returns the JSON fallback when provider data is invalid', async () => {
    const flag = {
      kind: 'json',
      key: 'test-json',
      defaultValue: [{ name: 'Fallback' }],
      schema: z.array(z.object({ name: z.string() })),
    } satisfies JsonFeatureFlagDefinition<{ name: string }[]>
    const provider = {
      getBoolean: vi.fn(),
      getJson: vi.fn().mockResolvedValue([{ name: 123 }]),
    }

    const result = await createFeatureFlagService(provider).getJson(
      flag,
      context
    )

    expect(result).toEqual([{ name: 'Fallback' }])
  })
})
