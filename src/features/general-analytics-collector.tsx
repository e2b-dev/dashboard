'use client'

import { supabase } from '@/lib/clients/supabase/client'
import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

export function GeneralAnalyticsCollector() {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        posthog?.identify(session.user.id, { email: session.user.email })
      } else if (event === 'SIGNED_OUT') {
        posthog?.reset()
      }
    })
  }, [posthog])

  return null
}
