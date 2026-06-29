import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const signOutMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth', () => ({
  signOut: signOutMock,
}))

const { GET } = await import('@/app/api/auth/sign-out/route')

// A cleared cookie carries an immediate expiry; Next emits Max-Age=0 and/or an
// epoch Expires depending on version, so accept either.
function clearedCookie(response: Response, name: string): string | undefined {
  return response.headers
    .getSetCookie()
    .find(
      (header) =>
        header.startsWith(`${name}=`) &&
        /(max-age=0|expires=thu, 01 jan 1970)/i.test(header)
    )
}

describe('sign-out route cookie clearing', () => {
  beforeEach(() => {
    signOutMock
      .mockReset()
      .mockResolvedValue({ redirectTo: 'https://app.e2b.dev/' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('clears the Ory Network identity cookie scoped to the parent domain', async () => {
    vi.stubEnv('NEXT_PUBLIC_E2B_DOMAIN', 'e2b-staging.dev')

    const response = await GET(
      new NextRequest('https://e2b-staging.dev/api/auth/sign-out', {
        headers: {
          cookie:
            'ory_session_abcdef=tok; e2b_session=sealed; ory_hydra_session_dev=h',
        },
      })
    )

    const oryClear = clearedCookie(response, 'ory_session_abcdef')
    expect(oryClear).toBeDefined()
    expect(oryClear).toMatch(/Domain=\.e2b-staging\.dev/i)

    // Our own token cache is dropped too.
    expect(clearedCookie(response, 'e2b_session')).toBeDefined()
    // Hydra's session cookie is ended by the RP-logout redirect, not here.
    expect(clearedCookie(response, 'ory_hydra_session_dev')).toBeUndefined()
  })

  it('clears the self-hosted ory_kratos_session cookie host-only', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/sign-out', {
        headers: { cookie: 'ory_kratos_session=tok' },
      })
    )

    const oryClear = clearedCookie(response, 'ory_kratos_session')
    expect(oryClear).toBeDefined()
    expect(oryClear).not.toMatch(/Domain=/i)
  })
})
