import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/core/shared/clients/logger/logger'
import type { AuthProvider } from '../provider'
import type {
  AuthContext,
  AuthUser,
  ReauthDispatch,
  SignOutOptions,
  SignOutResult,
  UpdateUserInput,
  UpdateUserResult,
} from '../types'

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

  getUserProfile(): Promise<AuthUser | null> {
    return Promise.resolve(null)
  }

  signOut(_options?: SignOutOptions): Promise<SignOutResult> {
    return Promise.resolve({
      redirectTo: AUTH_URLS.SIGN_IN,
      error: {
        message: 'OryHostedAuthProvider.signOut is not implemented yet',
        code: 'ory_stub_not_implemented',
      },
    })
  }

  updateUser(_input: UpdateUserInput): Promise<UpdateUserResult> {
    return Promise.resolve({
      ok: false,
      code: 'account_credentials_not_changeable',
      message: 'OryHostedAuthProvider.updateUser is not implemented yet',
    })
  }

  startReauthForAccountSettings(): Promise<ReauthDispatch> {
    return Promise.resolve({
      kind: 'sign-out',
      returnTo: PROTECTED_URLS.ACCOUNT_SETTINGS,
    })
  }

  signOutOtherSessions(): Promise<void> {
    return Promise.resolve()
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
