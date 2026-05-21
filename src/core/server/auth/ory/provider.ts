import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import type { AuthProvider } from '../provider'
import type { AuthContext, SignOutOptions } from '../types'

export class OryHostedAuthProvider implements AuthProvider {
  constructor(private readonly cookie: string = '') {}

  getAuthContext(): Promise<AuthContext | null> {
    return Promise.reject(
      new Error(
        `OryHostedAuthProvider.getAuthContext is not implemented yet (cookie length: ${this.cookie.length})`
      )
    )
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
