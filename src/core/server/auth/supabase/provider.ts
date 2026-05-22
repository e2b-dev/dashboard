import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/shared/clients/supabase/server'
import type { AuthProvider } from '../provider'
import type { AuthContext, SignOutOptions } from '../types'
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
    const { data, error } = await client.auth.getUser()

    if (error || !data.user) {
      return null
    }

    const {
      data: { session },
    } = await client.auth.getSession()

    if (!session?.access_token) {
      return null
    }

    return {
      user: toAuthUser(data.user),
      accessToken: session.access_token,
    }
  }

  async signOut(options?: SignOutOptions): Promise<void> {
    const client = await this.resolveClient()
    await client.auth.signOut(options)
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
