import { describe, expect, it } from 'vitest'
import {
  createRequestObservabilityContext,
  createRequestObservabilityContextFromHeaders,
  formatRequestLogMessage,
} from '@/core/shared/clients/logger/request-observability'

describe('request observability', () => {
  it('extracts request path from an absolute URL', () => {
    const requestContext = createRequestObservabilityContext({
      requestUrl: 'https://dashboard.test/dashboard/acme/sandboxes?tab=logs',
      transport: 'action',
      handlerName: 'addTeamMember',
    })

    expect(requestContext.request_path).toBe('/dashboard/acme/sandboxes')
    expect(requestContext.transport).toBe('action')
    expect(requestContext.handler_name).toBe('addTeamMember')
  })

  it('prefers referer when deriving browser-origin request context', () => {
    const headers = new Headers({
      origin: 'https://dashboard.test',
      referer: 'https://dashboard.test/dashboard/acme/sandboxes',
      'next-url': '/api/trpc',
    })

    const requestContext = createRequestObservabilityContextFromHeaders(
      headers,
      {
        fallbackPath: '/server/actions/addTeamMember',
        preferReferer: true,
      }
    )

    expect(requestContext.request_url).toBe(
      'https://dashboard.test/dashboard/acme/sandboxes'
    )
    expect(requestContext.request_path).toBe('/dashboard/acme/sandboxes')
  })

  it('prefixes log messages with the request path', () => {
    expect(
      formatRequestLogMessage('action addTeamMember failed', {
        request_path: '/dashboard/acme/sandboxes',
      })
    ).toBe('/dashboard/acme/sandboxes: action addTeamMember failed')
  })
})
