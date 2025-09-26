import posthog, { Survey } from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

import { createContext, useContext } from 'react'

interface AppPostHogContextValue {
  isInitialized: boolean
  dashboardFeedbackSurvey: Survey | null
}

const AppPostHogContext = createContext<AppPostHogContextValue | undefined>(
  undefined
)

export function useAppPostHogProvider() {
  const ctx = useContext(AppPostHogContext)

  if (!ctx) {
    throw new Error(
      'useAppPostHogProvider must be used within a PostHogProvider'
    )
  }

  return ctx
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [dashboardFeedbackSurvey, setDashboardFeedbackSurvey] =
    useState<Survey | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      // Note that PostHog will automatically capture page views and common events
      //
      // This setup utilizes Next.js rewrites to act as a reverse proxy, to improve
      // reliability of client-side tracking & make requests less likely to be intercepted by tracking blockers.
      // https://posthog.com/docs/libraries/next-js#configuring-a-reverse-proxy-to-posthog
      api_host: '/ph-proxy',
      ui_host: 'https://us.posthog.com',
      advanced_enable_surveys: true,
      disable_session_recording: process.env.NODE_ENV !== 'production',
      advanced_disable_toolbar_metrics: true,
      opt_in_site_apps: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
    })

    posthog.getSurveys((surveys) => {
      for (const survey of surveys) {
        switch (survey.id) {
          case process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID:
            setDashboardFeedbackSurvey(survey)
            break
        }
      }
      setIsInitialized(true)
    })
  }, [])

  return (
    <AppPostHogContext.Provider
      value={{ dashboardFeedbackSurvey, isInitialized }}
    >
      <PHProvider client={posthog}>{children}</PHProvider>
    </AppPostHogContext.Provider>
  )
}
