import 'server-only'

import { headers } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'
import type { AuthProvider } from '../provider'
import type {
  AuthContext,
  AuthUser,
  ReauthDispatch,
  SignOutOptions,
  SignOutResult,
  UpdateUserErrorCode,
  UpdateUserInput,
  UpdateUserResult,
} from '../types'
import {
  createServerClientForHeaders,
  createServerClientForProxy,
  type SupabaseServerClient,
} from './server-client'
import { toAuthUser } from './user'

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client?: SupabaseServerClient) {}

  async getAuthContext(): Promise<AuthContext | null> {
    const client = await this.resolveClient()
    const { data, error: userError } = await client.auth.getUser()

    if (userError) {
      if (!isAuthSessionMissingError(userError)) {
        l.error(
          {
            key: 'auth_provider:get_user:error',
            error: serializeErrorForLog(userError),
          },
          `supabase getUser failed: ${userError.message}`
        )
      }
      return null
    }

    if (!data.user) {
      return null
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession()

    if (sessionError) {
      l.error(
        {
          key: 'auth_provider:get_session:error',
          user_id: data.user.id,
          error: serializeErrorForLog(sessionError),
        },
        `supabase getSession failed: ${sessionError.message}`
      )
      return null
    }

    if (!sessionData.session?.access_token) {
      return null
    }

    return {
      user: toAuthUser(data.user),
      accessToken: sessionData.session.access_token,
    }
  }

  async getUserProfile(): Promise<AuthUser | null> {
    const client = await this.resolveClient()
    const { data, error } = await client.auth.getUser()

    if (error || !data.user) {
      if (error && !isAuthSessionMissingError(error)) {
        l.error(
          {
            key: 'auth_provider:get_user_profile:error',
            error: serializeErrorForLog(error),
          },
          `supabase getUser failed: ${error.message}`
        )
      }
      return null
    }

    return toAuthUser(data.user)
  }

  async signOut(options?: SignOutOptions): Promise<SignOutResult> {
    const client = await this.resolveClient()
    const { error } = await client.auth.signOut(
      options?.scope ? { scope: options.scope } : undefined
    )

    if (error) {
      l.error(
        {
          key: 'auth_provider:sign_out:error',
          error: serializeErrorForLog(error),
          context: {
            scope: options?.scope,
            error_code: error.code,
            error_status: error.status,
          },
        },
        `supabase signOut failed: ${error.message}`
      )
    }

    return {
      redirectTo: buildSignInRedirect(options?.returnTo),
      error: error ?? null,
    }
  }

  async updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
    const emailRedirectTo = input.email
      ? await buildEmailVerificationRedirect(input.email)
      : undefined

    const client = await this.resolveClient()
    const { data, error } = await client.auth.updateUser(
      {
        email: input.email,
        password: input.password,
        data: { name: input.name },
      },
      emailRedirectTo ? { emailRedirectTo } : undefined
    )

    if (!error) {
      return { ok: true, user: toAuthUser(data.user) }
    }

    const code = mapSupabaseUpdateError(error.code)
    // Preserve the original action behavior of throwing on unmapped errors so
    // they surface as unexpected server errors.
    if (!code) {
      throw error
    }

    return { ok: false, code, message: error.message }
  }

  async startReauthForAccountSettings(): Promise<ReauthDispatch> {
    return { kind: 'sign-out', returnTo: PROTECTED_URLS.ACCOUNT_SETTINGS }
  }

  async handleCredentialChangeSuccess(): Promise<void> {
    const client = await this.resolveClient()
    const { error } = await client.auth.signOut({ scope: 'others' })

    if (error) {
      l.error(
        {
          key: 'auth_provider:sign_out_others:error',
          error: serializeErrorForLog(error),
          context: { error_code: error.code, error_status: error.status },
        },
        `supabase signOut(others) failed: ${error.message}`
      )
    }
  }

  private resolveClient(): Promise<SupabaseServerClient> {
    return Promise.resolve(this.client ?? createClient())
  }
}

async function buildEmailVerificationRedirect(email: string): Promise<string> {
  const origin = (await headers()).get('origin')
  if (!origin) {
    throw new Error('Missing origin header for email update redirect')
  }

  const url = new URL('/api/auth/email-callback', origin)
  url.searchParams.set('new_email', email)
  return url.toString()
}

function mapSupabaseUpdateError(
  code: string | undefined
): UpdateUserErrorCode | null {
  switch (code) {
    case 'email_address_invalid':
      return 'email_invalid'
    case 'email_exists':
      return 'email_exists'
    case 'same_password':
      return 'same_password'
    case 'weak_password':
      return 'weak_password'
    case 'reauthentication_needed':
      return 'reauthentication_needed'
    default:
      return null
  }
}

export function createSupabaseAuthForProxy(
  request: NextRequest,
  response: NextResponse
): SupabaseAuthProvider {
  return new SupabaseAuthProvider(createServerClientForProxy(request, response))
}

export function createSupabaseAuthForHeaders(
  headers: Headers
): SupabaseAuthProvider {
  return new SupabaseAuthProvider(createServerClientForHeaders(headers))
}

function buildSignInRedirect(returnTo?: string): string {
  if (!returnTo) return AUTH_URLS.SIGN_IN
  const params = new URLSearchParams({ returnTo })
  return `${AUTH_URLS.SIGN_IN}?${params.toString()}`
}

function isAuthSessionMissingError(error: {
  message?: string
  name?: string
}): boolean {
  return (
    error.name === 'AuthSessionMissingError' ||
    error.message === 'Auth session missing!'
  )
}
