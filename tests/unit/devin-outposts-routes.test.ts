import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAttempt: vi.fn(),
  exchangeCode: vi.fn(),
  findStartedWorker: vi.fn(),
  getAuthContext: vi.fn(),
  getConnectUrl: vi.fn(),
  getTeamIdFromSlug: vi.fn(),
  launchWorker: vi.fn(),
  readAttempt: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: mocks.getAuthContext,
}))

vi.mock('@/core/server/functions/team/get-team-id-from-slug', () => ({
  getTeamIdFromSlug: mocks.getTeamIdFromSlug,
}))

vi.mock('@/core/modules/devin-outposts/oauth.server', () => {
  class DevinOAuthError extends Error {
    constructor(readonly kind: string) {
      super(`oauth:${kind}`)
    }
  }

  return {
    createDevinOAuthAttempt: mocks.createAttempt,
    DevinOAuthError,
    exchangeDevinConnectionCode: mocks.exchangeCode,
    getDevinOAuthConnectUrl: mocks.getConnectUrl,
    getDevinOAuthCookieName: () => 'e2b-devin-oauth',
    getDevinOAuthCookieOptions: () => ({
      httpOnly: true,
      maxAge: 1800,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }),
    isDevinOAuthConfigured: () => true,
    readDevinOAuthAttempt: mocks.readAttempt,
  }
})

vi.mock('@/core/modules/devin-outposts/worker.server', () => {
  class DevinWorkerLaunchError extends Error {
    constructor(readonly orphanedSandboxId?: string) {
      super('launch failed')
    }
  }

  return {
    DevinWorkerLaunchError,
    findStartedDevinWorker: mocks.findStartedWorker,
    launchDevinWorker: mocks.launchWorker,
  }
})

import { POST as start } from '@/app/api/connections/devin/start/route'
import { GET as callback } from '@/app/callback/route'
import { DevinOAuthError } from '@/core/modules/devin-outposts/oauth.server'
import { DevinWorkerLaunchError } from '@/core/modules/devin-outposts/worker.server'

const authContext = {
  accessToken: 'dashboard-token',
  user: { id: 'user-1' },
}
const attempt = {
  expiresAt: Date.now() + 60_000,
  nonce: 'nonce',
  operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
  returnOrigin: 'http://localhost:3000',
  teamId: 'team-1',
  teamSlug: 'test-team',
  userId: 'user-1',
  version: 1 as const,
}

describe('Devin OAuth routes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.getAuthContext.mockResolvedValue(authContext)
    mocks.getTeamIdFromSlug.mockResolvedValue({ ok: true, data: 'team-1' })
    mocks.createAttempt.mockReturnValue({
      attemptCookie: 'signed-attempt',
      connectUrl: new URL('https://app.devin.ai/outposts/connect?test=1'),
    })
    mocks.getConnectUrl.mockReturnValue(
      new URL('https://app.devin.ai/outposts/connect?resume=1')
    )
    mocks.readAttempt.mockReturnValue(null)
    mocks.findStartedWorker.mockResolvedValue(null)
  })

  it('requires a Dashboard session before creating OAuth state', async () => {
    mocks.getAuthContext.mockResolvedValue(null)

    const response = await start(startRequest())

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?returnTo=%2Fdashboard%2Ftest-team%2Fconnections%2Fdevin'
    )
    expect(mocks.createAttempt).not.toHaveBeenCalled()
  })

  it('redirects to Devin without touching the worker runtime', async () => {
    const response = await start(startRequest())

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'https://app.devin.ai/outposts/connect?test=1'
    )
    expect(response.headers.get('set-cookie')).toContain(
      'e2b-devin-oauth=signed-attempt'
    )
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(mocks.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team-1',
        teamSlug: 'test-team',
        userId: 'user-1',
      })
    )
    expect(mocks.createAttempt.mock.calls[0]?.[0]).not.toHaveProperty(
      'sandboxId'
    )
    expect(mocks.findStartedWorker).not.toHaveBeenCalled()
    expect(mocks.launchWorker).not.toHaveBeenCalled()
  })

  it('resumes an active authorization without creating new state', async () => {
    mocks.readAttempt.mockReturnValue(attempt)

    const response = await start(startRequest())

    expect(response.headers.get('location')).toBe(
      'https://app.devin.ai/outposts/connect?resume=1'
    )
    expect(mocks.getConnectUrl).toHaveBeenCalledWith(attempt)
    expect(mocks.createAttempt).not.toHaveBeenCalled()
  })

  it('rejects cross-site OAuth starts before creating state', async () => {
    const response = await start(startRequest('https://attacker.example'))

    expect(response.status).toBe(403)
    expect(mocks.createAttempt).not.toHaveBeenCalled()
    expect(mocks.launchWorker).not.toHaveBeenCalled()
  })

  it('rejects a callback without valid state and clears the cookie', async () => {
    const response = await callback(
      new NextRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard?devinOAuth=invalid_state'
    )
    expect(response.headers.get('set-cookie')).toContain(
      'e2b-devin-oauth=; Path=/; Expires='
    )
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('rejects a callback after the Dashboard user changes', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.getAuthContext.mockResolvedValue({
      ...authContext,
      user: { id: 'user-2' },
    })

    const response = await callback(callbackRequest())

    expect(response.headers.get('location')).toContain('devinOAuth=session')
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('rejects a callback when the team binding changes', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.getTeamIdFromSlug.mockResolvedValue({ ok: true, data: 'team-2' })

    const response = await callback(callbackRequest())

    expect(response.headers.get('location')).toContain('devinOAuth=access')
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.launchWorker).not.toHaveBeenCalled()
  })

  it('recovers an existing worker before redeeming the code again', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.findStartedWorker.mockResolvedValue('sandbox-1')

    const response = await callback(callbackRequest('already-used'))

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/test-team/sandboxes/sandbox-1/terminal'
    )
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('preserves state when worker recovery is unavailable', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.findStartedWorker.mockRejectedValue(new Error('infra unavailable'))

    const response = await callback(callbackRequest())

    expect(response.headers.get('location')).toContain('devinOAuth=launch')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('does not let an uncorrelated denial clear an active attempt', async () => {
    mocks.readAttempt.mockReturnValue(attempt)

    const response = await callback(
      callbackRequest(undefined, 'error=access_denied')
    )

    expect(response.headers.get('location')).toContain('devinOAuth=denied')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('creates the worker only after exchanging the Devin code', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockResolvedValue({
      accessToken: 'scoped-token',
      apiUrl: 'https://api.devin.ai',
      poolId: 'pool-1',
    })
    mocks.launchWorker.mockResolvedValue({ sandboxId: 'sandbox-1' })

    const response = await callback(callbackRequest())

    expect(mocks.exchangeCode).toHaveBeenCalledWith('one-time-code', attempt)
    expect(mocks.launchWorker).toHaveBeenCalledWith({
      accessToken: 'dashboard-token',
      apiUrl: 'https://api.devin.ai',
      operationId: attempt.operationId,
      outpostsToken: 'scoped-token',
      poolId: 'pool-1',
      teamId: 'team-1',
      userId: 'user-1',
    })
    expect(mocks.exchangeCode.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.launchWorker.mock.invocationCallOrder[0] ?? 0
    )
    expect(response.headers.get('location')).toContain(
      '/sandboxes/sandbox-1/terminal'
    )
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('clears consumed authorization state when worker creation fails', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockResolvedValue({
      accessToken: 'scoped-token',
      apiUrl: 'https://api.devin.ai',
      poolId: 'pool-1',
    })
    mocks.launchWorker.mockRejectedValue(new DevinWorkerLaunchError())

    const response = await callback(callbackRequest())

    expect(response.headers.get('location')).toContain('devinOAuth=launch')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('treats invalid_grant as restartable without creating a worker', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockRejectedValue(new DevinOAuthError('invalid_grant'))

    const response = await callback(callbackRequest('expired'))

    expect(response.headers.get('location')).toContain('devinOAuth=expired')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(mocks.launchWorker).not.toHaveBeenCalled()

    mocks.readAttempt.mockReturnValue(null)
    await start(startRequest())
    expect(mocks.createAttempt).toHaveBeenCalledOnce()
  })
})

function startRequest(origin = 'http://localhost:3000') {
  return new NextRequest(
    'http://localhost:3000/api/connections/devin/start?teamSlug=test-team',
    { headers: { origin } }
  )
}

function callbackRequest(code = 'one-time-code', query?: string) {
  const suffix = query ?? `code=${encodeURIComponent(code)}`
  return new NextRequest(`http://localhost:8765/callback?${suffix}`)
}
