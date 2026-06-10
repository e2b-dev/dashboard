'use client'

import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { GithubDark } from '@/components/ui/svgs/githubDark'
import { GithubLight } from '@/components/ui/svgs/githubLight'
import { AUTH_MIGRATION_IN_PROGRESS } from '@/configs/flags'
import { signInWithOAuthAction } from '@/core/server/actions/auth-actions'
import { Button } from '@/ui/primitives/button'
import { GoogleLogo } from './logos/google-logo'

// GitHub's mark is monochrome, so the svgl registry ships light/dark variants;
// render both and toggle with Tailwind's `dark:` variant (class strategy) so
// there's no theme-flash. The hidden variant is display:none, so it doesn't
// affect the button's flex `gap`. GithubLight is the dark mark (light mode);
// GithubDark is the light mark (dark mode).
function GitHubLogo() {
  return (
    <>
      <GithubLight
        className="h-5 w-5 dark:hidden"
        aria-hidden="true"
        focusable="false"
      />
      <GithubDark
        className="hidden h-5 w-5 dark:block"
        aria-hidden="true"
        focusable="false"
      />
    </>
  )
}

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
