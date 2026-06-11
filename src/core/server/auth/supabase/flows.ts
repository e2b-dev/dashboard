import 'server-only'

import type { Provider } from '@supabase/supabase-js'
import type { OtpType } from '@/core/modules/auth/models'
import { createClient } from '@/core/shared/clients/supabase/server'

type SignInWithOAuthOptions = {
  provider: Extract<Provider, 'github' | 'google'>
  redirectTo: string
  scopes?: string
}

type SignUpOptions = {
  email: string
  password: string
  emailRedirectTo: string
  data?: Record<string, unknown>
}

type VerifyTokenHashOtpOptions = {
  token_hash: string
  type: OtpType
}

export const supabaseAuthFlows = {
  async signInWithOAuth({
    provider,
    redirectTo,
    scopes,
  }: SignInWithOAuthOptions) {
    const client = await createClient()

    return client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, scopes },
    })
  },

  async signUp({ email, password, emailRedirectTo, data }: SignUpOptions) {
    const client = await createClient()

    return client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo, data },
    })
  },

  async signInWithPassword(email: string, password: string) {
    const client = await createClient()

    return client.auth.signInWithPassword({ email, password })
  },

  async resetPasswordForEmail(email: string) {
    const client = await createClient()

    return client.auth.resetPasswordForEmail(email)
  },

  async verifyOtp(input: VerifyTokenHashOtpOptions) {
    const client = await createClient()
    return client.auth.verifyOtp(input)
  },

  async exchangeCodeForSession(code: string) {
    const client = await createClient()
    return client.auth.exchangeCodeForSession(code)
  },
}
