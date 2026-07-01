import { redirect } from 'next/navigation'
import { AUTH_URLS, HELP_URLS, PROTECTED_URLS } from '@/configs/urls'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getAuthContext } from '@/core/server/auth'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { isLoopbackUrl } from '@/core/shared/schemas/url'
import { encodedRedirect } from '@/lib/utils/auth'
import { generateE2BUserAccessToken } from '@/lib/utils/server'
import { isVersionGreaterOrEqual } from '@/lib/utils/version'
import { CodeBlock } from '@/ui/code-block'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { CloudIcon, LaptopIcon, LinkIcon } from '@/ui/primitives/icons'

// Minimum CLI version that supports the OAuth JWT auth flow.
// CLI versions >= this use the new public-client OAuth flow;
// older versions fall back to the legacy e2b access token flow.
// Old binaries (pre-2.13.0) don't send cliVersion at all (it's a new param),
// so they correctly fall to 'legacy'.
const MIN_CLI_VERSION_FOR_HYDRA_FLOW = '2.13.0'

const CLI_UPDATE_COMMAND = 'npm install -g @e2b/cli@latest'

// Shown to legacy (<2.13) CLIs when access-token provisioning is disabled.
// The dashboard sends this string to the CLI's loopback server, which echoes
// it back via `state=error`; keeping it in one place lets the error page
// recognize the update-required case and surface the deprecation help link.
const CLI_UPDATE_REQUIRED_MESSAGE = `CLI update required. Run: ${CLI_UPDATE_COMMAND}`

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

function ErrorState({
  message,
  showDeprecationHelp = false,
}: {
  message?: string
  showDeprecationHelp?: boolean
}) {
  return (
    <div className="p-6 text-center">
      <CLIIcons />
      <h2 className="mt-6 text-base leading-7">Unable to link the CLI</h2>
      <div className="mt-12 text-start">
        {showDeprecationHelp ? (
          <div className="flex flex-col gap-4">
            <Alert variant="error" border="bottom">
              <AlertTitle>CLI update required</AlertTitle>
              <AlertDescription>
                Your CLI is out of date. Update to the latest version to
                continue:
              </AlertDescription>
            </Alert>
            <CodeBlock lang="bash">{CLI_UPDATE_COMMAND}</CodeBlock>
            <p className="text-fg-tertiary leading-relaxed">
              Access tokens are deprecated.{' '}
              <a
                href={HELP_URLS.ACCESS_TOKEN_DEPRECATION}
                target="_blank"
                rel="noopener"
                className="text-fg underline underline-offset-2 hover:opacity-80"
              >
                Learn more
              </a>
              .
            </p>
          </div>
        ) : (
          <Alert variant="error" border="bottom">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {message ??
                'Something went wrong while linking the CLI. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
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

  if (state === 'error') {
    return (
      <ErrorState
        message={error}
        showDeprecationHelp={error === CLI_UPDATE_REQUIRED_MESSAGE}
      />
    )
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
      errorUrl.searchParams.set('error', CLI_UPDATE_REQUIRED_MESSAGE)
      return redirect(errorUrl.toString())
    }
  }

  if (error) {
    return <ErrorState message={error} />
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
