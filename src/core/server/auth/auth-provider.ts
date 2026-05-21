export const AUTH_PROVIDER_TYPES = {
  MANAGED_SUPABASE: 'managed-supabase',
  HOSTED_ORY: 'hosted-ory',
} as const

export type AuthProviderType =
  (typeof AUTH_PROVIDER_TYPES)[keyof typeof AUTH_PROVIDER_TYPES]

export type AuthContext = {
  userId: string
  accessToken: string
  email?: string | null
}

export type SignOutOptions = {
  scope?: 'local' | 'others' | 'global'
}

export class MissingAuthSessionError extends Error {
  constructor() {
    super('Auth session is missing')
    this.name = 'MissingAuthSessionError'
  }
}

export abstract class AuthProvider<TType extends AuthProviderType> {
  constructor(readonly type: TType) {}

  abstract get authContext(): Promise<AuthContext | null>
  abstract get accessToken(): Promise<string | null>
  abstract signOut(options?: SignOutOptions): Promise<void>

  async requireAuthContext(): Promise<AuthContext> {
    const authContext = await this.authContext

    if (!authContext) {
      throw new MissingAuthSessionError()
    }

    return authContext
  }
}
