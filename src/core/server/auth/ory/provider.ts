import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import type { AuthProvider } from '../provider'
import type { AuthContext, SignOutOptions } from '../types'

export class OryHostedAuthProvider implements AuthProvider {
  constructor(private readonly cookie: string = '') {}

  // fail-closed until ory is wired: callers (proxy, middleware) treat null as
  // unauthenticated and redirect to sign-in instead of letting requests through
  getAuthContext(): Promise<AuthContext | null> {
    void this.cookie
    return Promise.resolve(null)
  }

  signOut(_options?: SignOutOptions): Promise<void> {
    return Promise.reject(
      new Error('OryHostedAuthProvider.signOut is not implemented yet')
    )
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
