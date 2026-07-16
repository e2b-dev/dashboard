import { describe, expect, it } from 'vitest'
import { sanitizeTRPCLoggerArgs } from '@/trpc/sanitize-logger-args'

describe('tRPC browser logger input', () => {
  it.each([
    'up',
    'down',
  ])('sanitizes %s logger payloads at the console sink', (direction) => {
    const args = sanitizeTRPCLoggerArgs([
      direction,
      {
        input: {
          apiKey: 'broad-secret',
          outpostsToken: 'scoped-secret',
          teamSlug: 'example-team',
        },
        result: direction === 'down' ? new Error('failed') : undefined,
      },
    ])

    expect(args[1]).toMatchObject({
      input: {
        _apiKey: 'string(12)',
        _outpostsToken: 'string(13)',
        teamSlug: 'example-team',
      },
    })
    expect(JSON.stringify(args)).not.toContain('broad-secret')
    expect(JSON.stringify(args)).not.toContain('scoped-secret')
  })
})
