import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import { isOryAuthEnabled } from '@/configs/flags'
import type { AuthAdmin } from './admin'
import { oryAuthAdmin } from './ory/admin'
import { oryAuthProvider } from './ory/provider'
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

export function createAuthForHeaders(headers: Headers): AuthProvider {
  return isOryAuthEnabled()
    ? oryAuthProvider
    : createSupabaseAuthForHeaders(headers)
}

export type { AuthAdmin } from './admin'
export type { AuthUser } from './types'
