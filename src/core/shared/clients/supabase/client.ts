'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/core/shared/contracts/database.types'

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
