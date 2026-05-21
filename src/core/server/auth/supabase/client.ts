import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/shared/clients/supabase/server'

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

export async function resolveSupabaseServerClient(
  client?: SupabaseServerClient
): Promise<SupabaseServerClient> {
  return client ?? (await createClient())
}

export function createSupabaseServerClientForProxy(
  request: NextRequest,
  response: NextResponse
): SupabaseServerClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  )
}

export function createSupabaseServerClientForHeaders(
  headers: Headers
): SupabaseServerClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  )
}
