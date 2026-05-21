import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import type { Provider } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/shared/clients/supabase/server'
import {
  AUTH_PROVIDER_TYPES,
  type AuthContext,
  AuthProvider,
  type SignOutOptions,
} from './auth-provider'

type SupabaseAuthClient = Awaited<ReturnType<typeof createClient>>['auth']
type SupabaseAdminClient =
  typeof import('@/core/shared/clients/supabase/admin')['supabaseAdmin']
type SupabaseAdminAuthClient = SupabaseAdminClient['auth']

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

export function createManagedSupabaseAuthProviderForProxy(
  request: NextRequest,
  response: NextResponse
) {
  return new ManagedSupabaseAuthProvider(
    createServerClient(
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
  )
}

export function createManagedSupabaseAuthProviderForHeaders(headers: Headers) {
  return new ManagedSupabaseAuthProvider(
    createServerClient(
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
  )
}

export type SignInWithOAuthOptions = {
  provider: Extract<Provider, 'github' | 'google'>
  redirectTo: string
  scopes?: string
}

export type SignUpOptions = {
  email: string
  password: string
  emailRedirectTo: string
  data?: Record<string, unknown>
}

export type UpdateUserOptions = {
  email?: string
  password?: string
  name?: string
  emailRedirectTo: string
}

export class ManagedSupabaseAuthProvider extends AuthProvider<
  typeof AUTH_PROVIDER_TYPES.MANAGED_SUPABASE
> {
  constructor(private readonly client?: SupabaseServerClient) {
    super(AUTH_PROVIDER_TYPES.MANAGED_SUPABASE)
  }

  get authContext(): Promise<AuthContext | null> {
    return this.resolveAuthContext()
  }

  get accessToken(): Promise<string | null> {
    return this.resolveAccessToken()
  }

  async signInWithOAuth({
    provider,
    redirectTo,
    scopes,
  }: SignInWithOAuthOptions) {
    const client = await this.getClient()

    return client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes,
      },
    })
  }

  async signUp({ email, password, emailRedirectTo, data }: SignUpOptions) {
    const client = await this.getClient()

    return client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data,
      },
    })
  }

  async signInWithPassword(email: string, password: string) {
    const client = await this.getClient()

    return client.auth.signInWithPassword({
      email,
      password,
    })
  }

  async resetPasswordForEmail(email: string) {
    const client = await this.getClient()

    return client.auth.resetPasswordForEmail(email)
  }

  async updateUser({
    email,
    password,
    name,
    emailRedirectTo,
  }: UpdateUserOptions) {
    const client = await this.getClient()

    return client.auth.updateUser(
      {
        email,
        password,
        data: {
          name,
        },
      },
      {
        emailRedirectTo,
      }
    )
  }

  async verifyOtp(...args: Parameters<SupabaseAuthClient['verifyOtp']>) {
    const client = await this.getClient()

    return client.auth.verifyOtp(...args)
  }

  async exchangeCodeForSession(code: string) {
    const client = await this.getClient()

    return client.auth.exchangeCodeForSession(code)
  }

  async getUserByAccessToken(accessToken: string) {
    const adminClient = await this.getAdminClient()

    return adminClient.auth.getUser(accessToken)
  }

  async getUserById(userId: string) {
    const adminClient = await this.getAdminClient()

    return adminClient.auth.admin.getUserById(userId)
  }

  async getAuthUserEmailsById(userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
    if (uniqueUserIds.length === 0) {
      return new Map<string, string | null>()
    }

    const adminClient = await this.getAdminClient()
    const { data, error } = await adminClient
      .from('auth_users')
      .select('id,email')
      .in('id', uniqueUserIds)

    if (error) {
      throw error
    }

    return new Map(
      data
        ?.filter((user) => user.id)
        .map((user) => [user.id as string, user.email]) ?? []
    )
  }

  async updateUserById(
    ...args: Parameters<SupabaseAdminAuthClient['admin']['updateUserById']>
  ) {
    const adminClient = await this.getAdminClient()

    return adminClient.auth.admin.updateUserById(...args)
  }

  async signOut(options?: SignOutOptions): Promise<void> {
    const client = await this.getClient()
    await client.auth.signOut(options)
  }

  private async resolveAuthContext(): Promise<AuthContext | null> {
    const client = await this.getClient()
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
      userId: data.user.id,
      accessToken: session.access_token,
      email: data.user.email,
    }
  }

  private async resolveAccessToken(): Promise<string | null> {
    const authContext = await this.authContext

    return authContext?.accessToken ?? null
  }

  private async getClient() {
    return this.client ?? (await createClient())
  }

  private async getAdminClient() {
    const { supabaseAdmin } = await import(
      '@/core/shared/clients/supabase/admin'
    )

    return supabaseAdmin
  }
}
