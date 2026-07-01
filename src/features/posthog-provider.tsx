import posthog, { type Survey } from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { createContext, useContext, useEffect, useState } from 'react'

export type PostHogEnvironment = 'production' | 'preview' | 'development'

interface PostHogBootstrapIdentity {
  distinctID: string
  email?: string
}

interface AppPostHogContextValue {
  enabled: boolean
  environment: PostHogEnvironment
  isLoaded: boolean
  isInitialized: boolean
  dashboardFeedbackSurvey: Survey | null
  setBootstrap: (identity: PostHogBootstrapIdentity) => void
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

export function PostHogProvider({
  children,
  enabled,
  environment,
}: {
  children: React.ReactNode
  enabled: boolean
  environment: PostHogEnvironment
}) {
  const [dashboardFeedbackSurvey, setDashboardFeedbackSurvey] =
    useState<Survey | null>(null)
  const [isLoaded, setIsLoaded] = useState(() => posthog.__loaded)
  const [isInitialized, setIsInitialized] = useState(false)
  const [bootstrap, setBootstrap] = useState<PostHogBootstrapIdentity | null>(
    null
  )

  // Only track the dashboard app — not auth, marketing, or proxied (docs/blog)
  // paths. PostHog initializes once a bootstrap identity is available, which
  // only happens inside the dashboard layout (see PostHogBootstrap). Gating on
  // bootstrap guarantees the first captured pageview is already identified.
  const shouldInit = enabled && !!bootstrap

  useEffect(() => {
    if (!shouldInit || !bootstrap || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return
    }

    const registerEnvironment = () => {
      posthog.register({
        environment,
      })
    }

    const loadDashboardFeedbackSurvey = () => {
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
    }

    const finishLoading = () => {
      registerEnvironment()
      loadDashboardFeedbackSurvey()
      setIsLoaded(true)
    }

    if (posthog.__loaded) {
      finishLoading()
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
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      advanced_enable_surveys: true,
      disable_session_recording: process.env.NODE_ENV !== 'production',
      advanced_disable_toolbar_metrics: true,
      opt_in_site_apps: true,
      bootstrap: {
        distinctID: bootstrap.distinctID,
        isIdentifiedID: true,
        ...(bootstrap.email ? { $set: { email: bootstrap.email } } : {}),
      },
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
        finishLoading()
      },
    })
  }, [environment, shouldInit, bootstrap])

  return (
    <AppPostHogContext.Provider
      value={{
        enabled,
        environment,
        isLoaded,
        dashboardFeedbackSurvey,
        isInitialized,
        setBootstrap,
      }}
    >
      <PHProvider client={posthog}>{children}</PHProvider>
    </AppPostHogContext.Provider>
  )
}
