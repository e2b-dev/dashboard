import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getAuthContext } from '@/core/server/auth'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { isLoopbackUrl } from '@/core/shared/schemas/url'
import { encodedRedirect } from '@/lib/utils/auth'
import { generateE2BUserAccessToken } from '@/lib/utils/server'
import { isVersionGreaterOrEqual } from '@/lib/utils/version'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { CloudIcon, LaptopIcon, LinkIcon } from '@/ui/primitives/icons'

// Minimum CLI version that supports the OAuth JWT auth flow.
// CLI versions >= this use the new public-client OAuth flow;
// older versions fall back to the legacy e2b access token flow.
// Old binaries (pre-2.13.0) don't send cliVersion at all (it's a new param),
// so they correctly fall to 'legacy'.
const MIN_CLI_VERSION_FOR_HYDRA_FLOW = '2.13.0'

type CLISearchParams = Promise<{
  next?: string
  cliVersion?: string
  state?: string
  error?: string
}>

type CLIFlow = 'hydra' | 'legacy'

function resolveCLIFlow(cliVersion: string | undefined): CLIFlow {
  if (!cliVersion) return 'legacy'
  return isVersionGreaterOrEqual(cliVersion, MIN_CLI_VERSION_FOR_HYDRA_FLOW)
    ? 'hydra'
    : 'legacy'
}

function handleHydraCLIAuth(next: string) {
  if (!isLoopbackUrl(next)) {
    throw new Error('Invalid redirect URL')
  }
  return redirect(`/api/auth/oauth/cli-start?next=${encodeURIComponent(next)}`)
}

async function handleLegacyCLIAuth(
  next: string,
  userEmail: string,
  authProviderAccessToken: string
) {
  if (!isLoopbackUrl(next)) {
    throw new Error('Invalid redirect URL')
  }

  const teamsResult = await createUserTeamsRepository({
    accessToken: authProviderAccessToken,
  }).listUserTeams()

  if (!teamsResult.ok) {
    throw new Error('Failed to resolve default team')
  }

  const defaultTeam =
    teamsResult.data.find((team) => team.isDefault && team.slug) ??
    teamsResult.data.find((team) => team.slug)

  if (!defaultTeam) {
    throw new Error('Failed to resolve default team')
  }

  const e2bAccessToken = await generateE2BUserAccessToken(
    authProviderAccessToken
  )

  const searchParams = new URLSearchParams({
    email: userEmail,
    accessToken: e2bAccessToken.token,
    defaultTeamId: defaultTeam.id,
  })

  return redirect(`${next}?${searchParams.toString()}`)
}

function CLIIcons() {
  return (
    <p className="flex items-center justify-center gap-4 text-3xl tracking-tight sm:text-4xl">
      <span className="text-fg-tertiary">
        <LaptopIcon className="size-8" />
      </span>
      <span className="text-fg-secondary">
        <LinkIcon className="size-4" />
      </span>
      <span className="text-fg-tertiary">
        <CloudIcon className="size-8" />
      </span>
    </p>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="error" border="bottom" className="text-start">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function SuccessState() {
  return (
    <>
      <h2 className="text-brand-400">Successfully linked</h2>
      <div>You can close this page and start using CLI.</div>
    </>
  )
}

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: CLISearchParams
}) {
  const { next, cliVersion, state, error } = await searchParams
  const authContext = await getAuthContext()

  if (state === 'success') {
    return <SuccessState />
  }

  if (!next || !isLoopbackUrl(next)) {
    l.error(
      {
        key: 'cli_auth:invalid_redirect_url',
        user_id: authContext?.user.id,
        context: { next },
      },
      `Invalid redirect URL: ${next}`
    )
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  if (!authContext) {
    const returnToParams = new URLSearchParams({ next })
    if (cliVersion) returnToParams.set('cliVersion', cliVersion)
    return redirect(
      `${AUTH_URLS.SIGN_IN}?returnTo=${encodeURIComponent(
        `${AUTH_URLS.CLI}?${returnToParams.toString()}`
      )}`
    )
  }

  const flow = resolveCLIFlow(cliVersion)

  if (flow === 'legacy') {
    const flagContext: FeatureFlagContext = {
      user: {
        id: authContext.user.id,
        email: authContext.user.email ?? undefined,
      },
    }
    const tokenProvisioningDisabled = await featureFlags.isEnabled(
      'disableE2BAccessTokenProvisioning',
      flagContext
    )

    if (tokenProvisioningDisabled) {
      const errorUrl = new URL(next)
      errorUrl.searchParams.set(
        'error',
        'CLI update required. Run: npm install -g @e2b/cli@latest'
      )
      return redirect(errorUrl.toString())
    }
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <CLIIcons />
        <h2 className="mt-6 text-base leading-7">
          Linking CLI with your account
        </h2>
        <div className="text-fg-tertiary mt-12 leading-8">
          <Suspense fallback={<div>Loading...</div>}>
            <ErrorAlert message={error} />
          </Suspense>
        </div>
      </div>
    )
  }

  try {
    if (flow === 'hydra') {
      return handleHydraCLIAuth(next)
    }

    if (!authContext.user.email) {
      throw new Error('No user email found')
    }

    return await handleLegacyCLIAuth(
      next,
      authContext.user.email,
      authContext.accessToken
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
      throw err
    }

    l.error(
      {
        key: 'cli_auth:unexpected_error',
        error: serializeErrorForLog(err),
        user_id: authContext.user.id,
        context: { next, flow },
      },
      `Unexpected error during CLI authentication: ${err instanceof Error ? err.message : String(err)}`
    )

    const redirectParams: Record<string, string> = { next }
    if (cliVersion) redirectParams.cliVersion = cliVersion

    return encodedRedirect(
      'error',
      '/auth/cli',
      (err as Error).message,
      redirectParams
    )
  }
}
