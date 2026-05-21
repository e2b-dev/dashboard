'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import {
  AUTH_PROVIDER_TYPES,
  type AuthProviderType,
} from '@/core/server/auth/auth-provider'
import { supabase } from '@/core/shared/clients/supabase/client'

type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null
) => void

abstract class ClientAuthProvider<TType extends AuthProviderType> {
  constructor(readonly type: TType) {}
}

class ManagedSupabaseClientAuthProvider extends ClientAuthProvider<
  typeof AUTH_PROVIDER_TYPES.MANAGED_SUPABASE
> {
  constructor() {
    super(AUTH_PROVIDER_TYPES.MANAGED_SUPABASE)
  }

  get session() {
    return supabase.auth.getSession()
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const clientAuthProvider = new ManagedSupabaseClientAuthProvider()
