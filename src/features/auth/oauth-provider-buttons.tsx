'use client'

import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { AUTH_MIGRATION_IN_PROGRESS } from '@/configs/flags'
import { signInWithOAuthAction } from '@/core/server/actions/auth-actions'
import { Button } from '@/ui/primitives/button'
import { GitHubLogo, GoogleLogo } from './logos'

export function OAuthProviders() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  const { execute, isTransitioning } = useAction(signInWithOAuthAction)
  const isOAuthDisabled = isTransitioning || AUTH_MIGRATION_IN_PROGRESS

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={() =>
          execute({ provider: 'google', returnTo: returnTo || undefined })
        }
        className="flex items-center gap-2"
        disabled={isTransitioning || AUTH_MIGRATION_IN_PROGRESS}
        title={
          AUTH_MIGRATION_IN_PROGRESS
            ? 'Sign-ins are temporarily paused'
            : undefined
        }
      >
        <GoogleLogo />
        Continue with Google
      </Button>

      <Button
        variant="secondary"
        onClick={() =>
          execute({ provider: 'github', returnTo: returnTo || undefined })
        }
        className="flex items-center gap-2"
        disabled={isOAuthDisabled}
        title={
          AUTH_MIGRATION_IN_PROGRESS
            ? 'Sign-ins are temporarily paused'
            : undefined
        }
      >
        <GitHubLogo />
        Continue with GitHub
      </Button>
    </div>
  )
}
