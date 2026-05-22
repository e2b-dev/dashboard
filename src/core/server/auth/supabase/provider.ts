import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'
import type { AuthProvider } from '../provider'
import type { AuthContext, SignOutOptions, SignOutResult } from '../types'
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
      l.error(
        {
          key: 'auth_provider:get_user:error',
          error: serializeErrorForLog(userError),
        },
        `supabase getUser failed: ${userError.message}`
      )
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

  async signOut(options?: SignOutOptions): Promise<SignOutResult> {
    const client = await this.resolveClient()
    const { error } = await client.auth.signOut(options)

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

    return { error: error ?? null }
  }

  private resolveClient(): Promise<SupabaseServerClient> {
    return Promise.resolve(this.client ?? createClient())
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
