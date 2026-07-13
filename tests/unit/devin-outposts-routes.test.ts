import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAttempt: vi.fn(),
  claimWorker: vi.fn(),
  cleanupWorker: vi.fn(),
  exchangeCode: vi.fn(),
  getAuthContext: vi.fn(),
  getConnectUrl: vi.fn(),
  getTeamIdFromSlug: vi.fn(),
  hasPersistedConnection: vi.fn(),
  isWorkerAvailable: vi.fn(),
  persistConnection: vi.fn(),
  prepareWorker: vi.fn(),
  readAttempt: vi.fn(),
  startPersistedWorker: vi.fn(),
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
    cleanupPreparedDevinWorker: mocks.cleanupWorker,
    claimPreparedDevinWorker: mocks.claimWorker,
    DevinWorkerLaunchError,
    hasPersistedDevinConnection: mocks.hasPersistedConnection,
    isPreparedDevinWorkerAvailable: mocks.isWorkerAvailable,
    persistPreparedDevinConnection: mocks.persistConnection,
    prepareDevinWorkerSandbox: mocks.prepareWorker,
    startPersistedDevinWorker: mocks.startPersistedWorker,
  }
})

import { POST as start } from '@/app/api/connections/devin/start/route'
import { GET as callback } from '@/app/callback/route'
import { DevinOAuthError } from '@/core/modules/devin-outposts/oauth.server'

const authContext = {
  accessToken: 'dashboard-token',
  user: { id: 'user-1' },
}
const attempt = {
  expiresAt: Date.now() + 60_000,
  nonce: 'nonce',
  operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
  returnOrigin: 'http://localhost:3000',
  sandboxId: 'sandbox-1',
  teamId: 'team-1',
  teamSlug: 'test-team',
  userId: 'user-1',
  version: 1 as const,
}

describe('Devin OAuth routes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    mocks.createAttempt.mockReset()
    mocks.claimWorker.mockReset()
    mocks.cleanupWorker.mockReset()
    mocks.exchangeCode.mockReset()
    mocks.getAuthContext.mockReset()
    mocks.getConnectUrl.mockReset()
    mocks.getTeamIdFromSlug.mockReset()
    mocks.hasPersistedConnection.mockReset()
    mocks.isWorkerAvailable.mockReset()
    mocks.persistConnection.mockReset()
    mocks.prepareWorker.mockReset()
    mocks.readAttempt.mockReset()
    mocks.startPersistedWorker.mockReset()
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
    mocks.claimWorker.mockResolvedValue('claimed')
    mocks.cleanupWorker.mockResolvedValue(true)
    mocks.hasPersistedConnection.mockResolvedValue(false)
    mocks.isWorkerAvailable.mockResolvedValue(true)
    mocks.prepareWorker.mockResolvedValue({ sandboxId: 'sandbox-1' })
  })

  it('requires a Dashboard session before creating OAuth state', async () => {
    mocks.getAuthContext.mockResolvedValue(null)
    const response = await start(
      startRequest(
        'http://localhost:3000/api/connections/devin/start?teamSlug=test-team'
      )
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?returnTo=%2Fdashboard%2Ftest-team%2Fconnections%2Fdevin'
    )
    expect(mocks.createAttempt).not.toHaveBeenCalled()
  })

  it('sets HttpOnly state and redirects an authorized user to Devin', async () => {
    const response = await start(
      startRequest(
        'http://localhost:3000/api/connections/devin/start?teamSlug=test-team'
      )
    )

    expect(response.headers.get('location')).toBe(
      'https://app.devin.ai/outposts/connect?test=1'
    )
    expect(response.status).toBe(303)
    expect(response.headers.get('set-cookie')).toContain(
      'e2b-devin-oauth=signed-attempt'
    )
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.prepareWorker).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-1', userId: 'user-1' })
    )
    expect(mocks.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        sandboxId: 'sandbox-1',
        teamId: 'team-1',
        teamSlug: 'test-team',
      })
    )
  })

  it('resumes an OAuth attempt without overwriting its state', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    const response = await start(
      startRequest(
        'http://localhost:3000/api/connections/devin/start?teamSlug=test-team'
      )
    )

    expect(response.headers.get('location')).toBe(
      'https://app.devin.ai/outposts/connect?resume=1'
    )
    expect(mocks.getConnectUrl).toHaveBeenCalledWith(attempt)
    expect(mocks.prepareWorker).not.toHaveBeenCalled()
    expect(mocks.createAttempt).not.toHaveBeenCalled()
  })

  it('replaces an attempt whose prepared sandbox no longer exists', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.isWorkerAvailable.mockResolvedValue(false)

    const response = await start(
      startRequest(
        'http://localhost:3000/api/connections/devin/start?teamSlug=test-team'
      )
    )

    expect(response.headers.get('location')).toBe(
      'https://app.devin.ai/outposts/connect?test=1'
    )
    expect(mocks.prepareWorker).toHaveBeenCalled()
    expect(mocks.createAttempt).toHaveBeenCalled()
  })

  it('rejects cross-site OAuth starts before preparing a sandbox', async () => {
    const response = await start(
      startRequest(
        'http://localhost:3000/api/connections/devin/start?teamSlug=test-team',
        'https://attacker.example'
      )
    )

    expect(response.status).toBe(403)
    expect(mocks.prepareWorker).not.toHaveBeenCalled()
    expect(mocks.createAttempt).not.toHaveBeenCalled()
  })

  it('rejects a callback without valid state and clears the cookie', async () => {
    mocks.readAttempt.mockReturnValue(null)
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

  it('preserves secure cookie attributes when clearing production state', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const response = await callback(
      new NextRequest('https://dashboard.example.com/callback?code=invalid')
    )

    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('Secure')
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax')
  })

  it('rejects a callback after the Dashboard user changes', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.getAuthContext.mockResolvedValue({
      ...authContext,
      user: { id: 'user-2' },
    })
    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/test-team/connections/devin?devinOAuth=session'
    )
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('rejects a callback when the slug resolves to a different team', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.getTeamIdFromSlug.mockResolvedValue({ ok: true, data: 'team-2' })
    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(response.headers.get('location')).toContain('devinOAuth=access')
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.cleanupWorker).toHaveBeenCalledWith({
      accessToken: 'dashboard-token',
      sandboxId: 'sandbox-1',
      teamId: 'team-1',
    })
  })

  it('recovers a completed worker without redeeming the code again', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.claimWorker.mockResolvedValue('started')
    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=already-used')
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/test-team/sandboxes/sandbox-1/terminal'
    )
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('preserves state while another callback owns the operation', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.claimWorker.mockResolvedValue('busy')

    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(response.headers.get('location')).toContain('devinOAuth=in_progress')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.cleanupWorker).not.toHaveBeenCalled()
  })

  it('preserves state when persisted connection inspection is unavailable', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.hasPersistedConnection.mockRejectedValue(
      new Error('envd unavailable')
    )

    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(response.headers.get('location')).toContain('devinOAuth=launch')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.cleanupWorker).not.toHaveBeenCalled()
  })

  it('resumes worker startup from credentials persisted in the sandbox', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.hasPersistedConnection.mockResolvedValue(true)
    mocks.startPersistedWorker.mockResolvedValue({ sandboxId: 'sandbox-1' })

    const response = await callback(
      callbackRequest('http://localhost:8765/callback')
    )

    expect(response.headers.get('location')).toContain(
      '/sandboxes/sandbox-1/terminal'
    )
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.startPersistedWorker).toHaveBeenCalled()
  })

  it('distinguishes provider failure from explicit authorization denial', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    const providerFailure = await callback(
      callbackRequest('http://localhost:8765/callback?error=server_error')
    )
    expect(providerFailure.headers.get('location')).toContain(
      'devinOAuth=provider'
    )

    mocks.readAttempt.mockReturnValue(attempt)
    const denial = await callback(
      callbackRequest('http://localhost:8765/callback?error=access_denied')
    )
    expect(denial.headers.get('location')).toContain('devinOAuth=denied')
    expect(denial.headers.get('set-cookie')).toBeNull()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
    expect(mocks.cleanupWorker).not.toHaveBeenCalled()
  })

  it('maps a consumed or expired code without launching a worker', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockRejectedValue(new DevinOAuthError('invalid_grant'))
    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=expired')
    )

    expect(response.headers.get('location')).toContain('devinOAuth=expired')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.startPersistedWorker).not.toHaveBeenCalled()
  })

  it('exchanges the code server-side and redirects to the worker terminal', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockResolvedValue({
      accessToken: 'scoped-token',
      apiUrl: 'https://api.devin.ai',
      poolId: 'pool-1',
    })
    mocks.startPersistedWorker.mockResolvedValue({ sandboxId: 'sandbox-1' })
    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(mocks.exchangeCode).toHaveBeenCalledWith('one-time-code', attempt)
    expect(mocks.persistConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        outpostsToken: 'scoped-token',
        poolId: 'pool-1',
        sandboxId: 'sandbox-1',
        teamId: 'team-1',
        userId: 'user-1',
      })
    )
    expect(mocks.startPersistedWorker).toHaveBeenCalledWith(
      expect.objectContaining({ sandboxId: 'sandbox-1' }),
      { cleanupOnFailure: false }
    )
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/test-team/sandboxes/sandbox-1/terminal'
    )
    expect(response.headers.get('set-cookie')).toContain(
      'e2b-devin-oauth=; Path=/; Expires='
    )
  })

  it('recovers when credential persistence completed before its response failed', async () => {
    mocks.readAttempt.mockReturnValue(attempt)
    mocks.exchangeCode.mockResolvedValue({
      accessToken: 'scoped-token',
      apiUrl: 'https://api.devin.ai',
      poolId: 'pool-1',
    })
    mocks.persistConnection.mockRejectedValue(new Error('response lost'))
    mocks.hasPersistedConnection
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    mocks.startPersistedWorker.mockResolvedValue({ sandboxId: 'sandbox-1' })

    const response = await callback(
      callbackRequest('http://localhost:8765/callback?code=one-time-code')
    )

    expect(mocks.exchangeCode).toHaveBeenCalledTimes(1)
    expect(mocks.hasPersistedConnection).toHaveBeenCalledTimes(2)
    expect(mocks.startPersistedWorker).toHaveBeenCalled()
    expect(response.headers.get('location')).toContain(
      '/sandboxes/sandbox-1/terminal'
    )
  })
})

function callbackRequest(url: string) {
  return new NextRequest(url, {
    headers: { cookie: 'e2b-devin-oauth=signed-attempt' },
  })
}

function startRequest(url: string, origin = 'http://localhost:3000') {
  return new NextRequest(url, {
    headers: { origin },
    method: 'POST',
  })
}
