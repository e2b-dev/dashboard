import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/core/shared/clients/supabase/server'
import type { Database } from '@/core/shared/contracts/database.types'
import {
  type AuthContext,
  AuthSessionProvider,
  type SignOutOptions,
} from './session-provider'

type SupabaseServerClient = SupabaseClient<Database>

export class SupabaseAuthSessionProvider extends AuthSessionProvider {
  constructor(private readonly client?: SupabaseServerClient) {
    super()
  }

  async getAuthContext(): Promise<AuthContext | null> {
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

  async getAccessToken(): Promise<string | null> {
    const authContext = await this.getAuthContext()

    return authContext?.accessToken ?? null
  }

  async signOut(options?: SignOutOptions): Promise<void> {
    const client = await this.getClient()
    await client.auth.signOut(options)
  }

  private async getClient() {
    return this.client ?? (await createClient())
  }
}
