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

export abstract class AuthSessionProvider {
  abstract get authContext(): Promise<AuthContext | null>
  abstract getAccessToken(): Promise<string | null>
  abstract signOut(options?: SignOutOptions): Promise<void>

  async requireAuthContext(): Promise<AuthContext> {
    const authContext = await this.authContext

    if (!authContext) {
      throw new MissingAuthSessionError()
    }

    return authContext
  }
}
