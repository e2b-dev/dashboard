import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type OryFlowState,
  openOryFlowState,
  oryFlowCookieOptions,
  sealOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'

const flow: OryFlowState = {
  state: 'state-value',
  nonce: 'nonce-value',
  codeVerifier: 'code-verifier-value',
  returnTo: '/dashboard',
}

describe('e2b_oauth_flow cookie', () => {
  beforeEach(() => {
    vi.stubEnv('E2B_SESSION_SECRET', 'unit-test-session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips all fields through seal/open', async () => {
    const sealed = await sealOryFlowState(flow)

    expect(sealed).not.toContain('code-verifier-value')
    expect(await openOryFlowState(sealed)).toEqual(flow)
  })

  it('preserves a flow without returnTo', async () => {
    const minimal: OryFlowState = {
      state: 'state-value',
      nonce: 'nonce-value',
      codeVerifier: 'code-verifier-value',
    }

    expect(await openOryFlowState(await sealOryFlowState(minimal))).toEqual(
      minimal
    )
  })

  it('returns null for missing or empty values', async () => {
    expect(await openOryFlowState(undefined)).toBeNull()
    expect(await openOryFlowState(null)).toBeNull()
    expect(await openOryFlowState('')).toBeNull()
  })

  it('returns null for a garbage value', async () => {
    expect(await openOryFlowState('not-a-valid-jwe')).toBeNull()
  })

  it('returns null for a tampered cookie', async () => {
    const sealed = await sealOryFlowState(flow)

    expect(await openOryFlowState(`${sealed}tamper`)).toBeNull()
  })

  it('returns null when sealed under a different secret', async () => {
    const sealed = await sealOryFlowState(flow)

    vi.stubEnv('E2B_SESSION_SECRET', 'a-different-secret')

    expect(await openOryFlowState(sealed)).toBeNull()
  })

  it('returns null when a required field is missing', async () => {
    const partial = await sealOryFlowState({
      state: 'state-value',
      codeVerifier: 'code-verifier-value',
    } as OryFlowState)

    expect(await openOryFlowState(partial)).toBeNull()
  })

  it('rejects sealing without a configured secret', async () => {
    vi.stubEnv('E2B_SESSION_SECRET', '')

    await expect(sealOryFlowState(flow)).rejects.toThrow(
      'E2B_SESSION_SECRET is not configured'
    )
  })

  it('marks the cookie httpOnly + lax and toggles secure on NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(oryFlowCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
    })

    vi.stubEnv('NODE_ENV', 'development')
    expect(oryFlowCookieOptions().secure).toBe(false)
  })
})
