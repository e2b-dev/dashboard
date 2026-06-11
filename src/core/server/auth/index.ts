import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { isOryAuthEnabled } from '@/configs/flags'
import type { AuthAdmin } from './admin'
import { oryAuthAdmin } from './ory/admin'
import { createOryAuthProvider, oryAuthProvider } from './ory/provider'
import type { AuthProvider } from './provider'
import { supabaseAuthAdmin } from './supabase/admin'
import {
  createSupabaseAuthForHeaders,
  createSupabaseAuthForProxy,
  SupabaseAuthProvider,
} from './supabase/provider'

export const auth: AuthProvider = isOryAuthEnabled()
  ? oryAuthProvider
  : new SupabaseAuthProvider()

export const authAdmin: AuthAdmin = isOryAuthEnabled()
  ? oryAuthAdmin
  : supabaseAuthAdmin

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
export type { AuthAdmin } from './admin'
