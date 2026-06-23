import { FlowType } from '@ory/client-fetch'
import type { FlowContextValue } from '@ory/elements-react'
import { describe, expect, it } from 'vitest'
import { getReauthInfo } from '@/app/login/components/reauth'

function loginFlow({
  refresh,
  requestedAal,
  groups = [],
}: {
  refresh?: boolean
  requestedAal?: string
  groups?: string[]
}): FlowContextValue {
  return {
    flowType: FlowType.Login,
    flow: {
      refresh,
      requested_aal: requestedAal,
      ui: { nodes: groups.map((group) => ({ group })) },
    },
  } as unknown as FlowContextValue
}

describe('getReauthInfo', () => {
  it('is not a reauth on a normal login flow', () => {
    expect(getReauthInfo(loginFlow({ groups: ['password'] }))).toEqual({
      isReauthLogin: false,
      credential: null,
    })
  })

  it('detects a refresh flow and its password credential', () => {
    expect(
      getReauthInfo(loginFlow({ refresh: true, groups: ['default', 'password'] }))
    ).toEqual({ isReauthLogin: true, credential: 'password' })
  })

  it('detects a social credential when only oidc nodes are present', () => {
    expect(
      getReauthInfo(loginFlow({ refresh: true, groups: ['default', 'oidc'] }))
    ).toEqual({ isReauthLogin: true, credential: 'social' })
  })

  it('prefers password when the identity has both', () => {
    expect(
      getReauthInfo(
        loginFlow({ refresh: true, groups: ['password', 'oidc'] })
      ).credential
    ).toBe('password')
  })

  it('treats an AAL2 step-up as reauth', () => {
    const result = getReauthInfo(
      loginFlow({ requestedAal: 'aal2', groups: ['totp'] })
    )
    expect(result.isReauthLogin).toBe(true)
    expect(result.credential).toBeNull()
  })

  it('is not a reauth for non-login flows', () => {
    const recovery = { flowType: FlowType.Recovery } as FlowContextValue
    expect(getReauthInfo(recovery).isReauthLogin).toBe(false)
  })
})
