import 'server-only'

import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAuthConfig } from '@/core/shared/clients/supabase/env'
import type { createClient } from '@/core/shared/clients/supabase/server'

type SupabaseAuthClient = Awaited<ReturnType<typeof createClient>>['auth']

export type SupabaseServerClient = {
  auth: Pick<
    SupabaseAuthClient,
    | 'exchangeCodeForSession'
    | 'getSession'
    | 'getUser'
    | 'resetPasswordForEmail'
    | 'signInWithOAuth'
    | 'signInWithPassword'
    | 'signOut'
    | 'signUp'
    | 'updateUser'
    | 'verifyOtp'
  >
}

export function createServerClientForProxy(
  request: NextRequest,
  response: NextResponse
): SupabaseServerClient {
  const { url, anonKey } = getSupabaseAuthConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

export function createServerClientForHeaders(
  headers: Headers
): SupabaseServerClient {
  const { url, anonKey } = getSupabaseAuthConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(headers.get('cookie') ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            'Set-Cookie',
            serializeCookieHeader(name, value, options)
          )
        })
      },
    },
  })
}
