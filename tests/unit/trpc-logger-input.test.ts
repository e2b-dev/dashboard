import { describe, expect, it, vi } from 'vitest'
import { sanitizedTRPCConsole } from '@/trpc/sanitize-logger-args'

describe('tRPC browser logger input', () => {
  it.each([
    'error',
    'log',
  ] as const)('sanitizes the installed console.%s adapter', (method) => {
    const consoleSpy = vi
      .spyOn(console, method)
      .mockImplementation(() => undefined)

    sanitizedTRPCConsole[method](method === 'log' ? 'up' : 'down', {
      input: {
        apiKey: 'broad-secret',
        outpostsToken: 'scoped-secret',
        teamSlug: 'example-team',
      },
      result: method === 'error' ? new Error('failed') : undefined,
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      method === 'log' ? 'up' : 'down',
      expect.objectContaining({
        input: {
          _apiKey: 'string(12)',
          _outpostsToken: 'string(13)',
          teamSlug: 'example-team',
        },
      })
    )
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('broad-secret')
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('scoped-secret')
    consoleSpy.mockRestore()
  })
})
