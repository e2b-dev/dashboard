import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { isOryAuthEnabled } from '@/configs/flags'
import { createOryAuthProvider, oryAuthProvider } from './ory/provider'
import type { AuthProvider } from './provider'
import {
  createSupabaseAuthForHeaders,
  createSupabaseAuthForProxy,
  SupabaseAuthProvider,
} from './supabase/provider'

export const auth: AuthProvider = isOryAuthEnabled()
  ? oryAuthProvider
  : new SupabaseAuthProvider()

export function createAuthForProxy(
  request: NextRequest,
  response: NextResponse
): AuthProvider {
  return isOryAuthEnabled()
    ? oryAuthProvider
    : createSupabaseAuthForProxy(request, response)
}

export function createAuthForHeaders(
  headers: Headers,
  authSession?: Session | null
): AuthProvider {
  return isOryAuthEnabled()
    ? createOryAuthProvider(authSession)
    : createSupabaseAuthForHeaders(headers)
}

export type { AuthUser } from '@/core/modules/auth/models'
