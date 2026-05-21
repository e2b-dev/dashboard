import {
  AUTH_PROVIDER_TYPES,
  type AuthContext,
  AuthProvider,
  type SignOutOptions,
} from './auth-provider'

export class HostedOryAuthProvider extends AuthProvider<
  typeof AUTH_PROVIDER_TYPES.HOSTED_ORY
> {
  constructor() {
    super(AUTH_PROVIDER_TYPES.HOSTED_ORY)
  }

  get authContext(): Promise<AuthContext | null> {
    throw new Error('Hosted Ory auth provider is not implemented yet')
  }

  get accessToken(): Promise<string | null> {
    throw new Error('Hosted Ory auth provider is not implemented yet')
  }

  signOut(_options?: SignOutOptions): Promise<void> {
    throw new Error('Hosted Ory auth provider is not implemented yet')
  }
}
