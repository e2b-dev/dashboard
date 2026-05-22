import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import { l } from '@/core/shared/clients/logger/logger'
import type { AuthProvider } from '../provider'
import type { AuthContext, SignOutOptions, SignOutResult } from '../types'

export class OryHostedAuthProvider implements AuthProvider {
  constructor(private readonly cookie: string = '') {}

  // fail-closed until ory is wired: callers (proxy, middleware) treat null as
  // unauthenticated and redirect to sign-in instead of letting requests through
  getAuthContext(): Promise<AuthContext | null> {
    void this.cookie
    l.warn(
      {
        key: 'auth_provider:ory_stub_unauthenticated',
      },
      'OryHostedAuthProvider.getAuthContext is a stub and always returns null'
    )
    return Promise.resolve(null)
  }

  signOut(_options?: SignOutOptions): Promise<SignOutResult> {
    return Promise.resolve({
      error: {
        message: 'OryHostedAuthProvider.signOut is not implemented yet',
        code: 'ory_stub_not_implemented',
      },
    })
  }
}

export function createOryAuthForProxy(
  request: NextRequest,
  _response: NextResponse
): OryHostedAuthProvider {
  return new OryHostedAuthProvider(request.headers.get('cookie') ?? '')
}

export function createOryAuthForHeaders(
  headers: Headers
): OryHostedAuthProvider {
  return new OryHostedAuthProvider(headers.get('cookie') ?? '')
}
