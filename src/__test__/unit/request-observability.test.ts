import { describe, expect, it } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'
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

  it('removes query strings and hashes from logged request URLs', () => {
    const requestContext = createRequestObservabilityContext({
      requestUrl:
        'https://dashboard.test/auth/callback?code=secret-code&returnTo=%2Fdashboard#acct',
      transport: 'route',
      handlerName: 'authCallback',
    })

    expect(requestContext.request_url).toBe(
      'https://dashboard.test/auth/callback'
    )
    expect(requestContext.request_path).toBe('/auth/callback')
  })

  it('prefers referer when deriving browser-origin request context', () => {
    const headers = new Headers({
      origin: 'https://dashboard.test',
      referer:
        'https://dashboard.test/dashboard/acme/sandboxes?tab=logs&token=secret',
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

  it('strips query strings from explicit request paths', () => {
    const requestContext = createRequestObservabilityContext({
      requestPath: '/api/trpc?batch=1&input=secret-payload',
      transport: 'trpc',
      handlerName: 'http',
    })

    expect(requestContext.request_path).toBe('/api/trpc')
  })

  it('prefixes log messages with the request path', () => {
    expect(
      formatRequestLogMessage('action addTeamMember failed', {
        request_path: '/dashboard/acme/sandboxes',
      })
    ).toBe('/dashboard/acme/sandboxes: action addTeamMember failed')
  })

  it('preserves request observability in the tRPC context', async () => {
    const requestObservability = createRequestObservabilityContext({
      requestUrl: 'https://dashboard.test/dashboard/acme/sandboxes',
      transport: 'trpc',
      handlerName: 'http',
    })

    const context = await createTRPCContext({
      headers: new Headers(),
      requestObservability,
    })

    expect(context.requestObservability).toEqual(requestObservability)
  })
})
