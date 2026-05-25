import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTH_PROVIDER_TEAM_HEADER,
  authHeaders,
  SUPABASE_TEAM_HEADER,
  SUPABASE_TOKEN_HEADER,
} from '@/configs/api'

const originalAuthProvider = process.env.AUTH_PROVIDER

afterEach(() => {
  process.env.AUTH_PROVIDER = originalAuthProvider
})

describe('authHeaders', () => {
  it('uses Supabase headers by default', () => {
    process.env.AUTH_PROVIDER = 'supabase'

    expect(authHeaders('token', 'team-id')).toEqual({
      [SUPABASE_TOKEN_HEADER]: 'token',
      [SUPABASE_TEAM_HEADER]: 'team-id',
    })
  })

  it('uses Authorization and X-Team-ID in Ory mode', () => {
    process.env.AUTH_PROVIDER = 'ory'

    expect(authHeaders('token', 'team-id')).toEqual({
      Authorization: 'Bearer token',
      [AUTH_PROVIDER_TEAM_HEADER]: 'team-id',
    })
  })
})
