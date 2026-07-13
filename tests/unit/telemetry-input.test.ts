import { describe, expect, it } from 'vitest'
import { sanitizeClientInput } from '@/core/shared/observability/sanitize-input'

describe('tRPC telemetry input', () => {
  it('keeps identifiers and replaces credentials with type hints', () => {
    expect(
      sanitizeClientInput({
        apiKey: 'broad-secret',
        outpostsToken: 'scoped-secret',
        poolId: 'pool-secret-shaped',
        teamSlug: 'example-team',
      })
    ).toEqual({
      _apiKey: 'string(12)',
      _outpostsToken: 'string(13)',
      _poolId: 'string(18)',
      teamSlug: 'example-team',
    })
  })
})
