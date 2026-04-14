import { CloudIcon, SystemIcon, LinkIcon } from '@/ui/primitives/icons'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { generateE2BUserAccessToken } from '@/lib/utils/server'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'

// Types
type CLISearchParams = Promise<{
  next?: string
  state?: string
  error?: string
}>

// Server Actions

async function handleCLIAuth(
  next: string,
  userEmail: string,
  supabaseAccessToken: string
) {
  if (!next?.startsWith('http://localhost')) {
    throw new Error('Invalid redirect URL')
  }

  const teamsResult = await createUserTeamsRepository({
    accessToken: supabaseAccessToken,
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

  const e2bAccessToken = await generateE2BUserAccessToken(supabaseAccessToken)

  const searchParams = new URLSearchParams({
    email: userEmail,
    accessToken: e2bAccessToken.token,
    defaultTeamId: defaultTeam.id,
  })

  return redirect(`${next}?${searchParams.toString()}`)
}

// UI Components
function CLIIcons() {
  return (
    <p className="flex items-center justify-center gap-4 text-3xl  tracking-tight sm:text-4xl">
      <span className="text-fg-tertiary">
        <SystemIcon className="size-8" />
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
      <h2 className="text-brand-400 ">Successfully linked</h2>
      <div>You can close this page and start using CLI.</div>
    </>
  )
}

// Main Component
export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: CLISearchParams
}) {
  const { next, state, error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (state === 'success') {
    return <SuccessState />
  }

  // Validate redirect URL
  if (!next?.startsWith('http://localhost')) {
    l.error(
      {
        key: 'cli_auth:invalid_redirect_url',
        user_id: user?.id,
        context: {
          next,
        },
      },
      `Invalid redirect URL: ${next}`
    )
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  // If user is not authenticated, redirect to sign in with return URL
  if (!user) {
    const searchParams = new URLSearchParams({
      returnTo: `${AUTH_URLS.CLI}?${new URLSearchParams({ next }).toString()}`,
    })
    redirect(`${AUTH_URLS.SIGN_IN}?${searchParams.toString()}`)
  }

  // Handle CLI callback if authenticated
  if (!error && next && user) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No provider access token found')
      }

      if (!user.email) {
        throw new Error('No user email found')
      }

      return await handleCLIAuth(next, user.email, session.access_token)
    } catch (err) {
      if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
        throw err
      }

      l.error(
        {
          key: 'cli_auth:unexpected_error',
          error: serializeErrorForLog(err),
          user_id: user?.id,
          context: {
            next,
          },
        },
        `Unexpected error during CLI authentication: ${err instanceof Error ? err.message : String(err)}`
      )

      return encodedRedirect('error', '/auth/cli', (err as Error).message, {
        next,
      })
    }
  }

  return (
    <div className="p-6 text-center">
      <CLIIcons />
      <h2 className="mt-6 text-base leading-7">
        Linking CLI with your account
      </h2>
      <div className="text-fg-tertiary mt-12 leading-8">
        <Suspense fallback={<div>Loading...</div>}>
          {error ? (
            <ErrorAlert message={decodeURIComponent(error)} />
          ) : (
            <div>Authorizing CLI...</div>
          )}
        </Suspense>
      </div>
    </div>
  )
}
