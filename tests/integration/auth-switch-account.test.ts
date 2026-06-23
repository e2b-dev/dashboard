import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const revokeCurrentSessionMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth', () => ({
  revokeCurrentSession: revokeCurrentSessionMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/api/auth/switch-account/route')

function switchRequest({
  returnTo,
  cookie = 'e2b_session=tokencache; ory_kratos_session=session-token',
}: { returnTo?: string | null; cookie?: string } = {}): NextRequest {
  const url = new URL('https://app.e2b.dev/api/auth/switch-account')
  if (returnTo != null) url.searchParams.set('returnTo', returnTo)
  return new NextRequest(url, { headers: { cookie } })
}

describe('switch-account route', () => {
  beforeEach(() => {
    revokeCurrentSessionMock.mockReset().mockResolvedValue(undefined)
  })

  it('revokes the current session and starts a fresh sign-in with returnTo', async () => {
    const response = await GET(switchRequest({ returnTo: '/dashboard/keys' }))

    expect(revokeCurrentSessionMock).toHaveBeenCalledOnce()

    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/api/auth/oauth/start')
    expect(location).toContain('intent=signin')
    expect(location).toContain('returnTo=%2Fdashboard%2Fkeys')
  })

  it('clears the e2b_session and Ory identity cookies on the redirect', async () => {
    const response = await GET(switchRequest())

    expect(response.cookies.get('e2b_session')?.value).toBe('')
    expect(response.cookies.get('ory_kratos_session')?.value).toBe('')
  })

  it('drops an absolute returnTo (open-redirect guard)', async () => {
    const response = await GET(
      switchRequest({ returnTo: 'https://evil.example.com/phish' })
    )

    const location = response.headers.get('location') ?? ''
    expect(location).toContain('intent=signin')
    expect(location).not.toContain('returnTo=')
  })

  it('still completes when there is no Kratos session left to clear', async () => {
    const response = await GET(switchRequest({ cookie: '' }))

    expect(revokeCurrentSessionMock).toHaveBeenCalledOnce()
    expect(response.headers.get('location')).toContain('intent=signin')
  })
})
