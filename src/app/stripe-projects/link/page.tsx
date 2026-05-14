import { redirect } from 'next/navigation'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import type { TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { createClient } from '@/core/shared/clients/supabase/server'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'

type StripeProjectsLinkSearchParams = Promise<{
  account_request_id?: string
  confirmation_secret?: string
}>

type ConfirmResponse = {
  type?: string
  error?: string
}

function infraAPIBaseURL() {
  return (
    process.env.NEXT_PUBLIC_INFRA_API_URL ||
    `https://api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`
  )
}

function paymentStateForTeam(team: TeamModel) {
  if (!team.isBlocked) {
    return {
      label: 'Payment ready',
      badge: 'positive' as const,
      description: 'This team can receive provisioned resources.',
    }
  }

  if (team.blockedReason?.includes('payment')) {
    return {
      label: 'Needs payment',
      badge: 'warning' as const,
      description: 'This team needs payment setup before resources can run.',
    }
  }

  return {
    label: 'Blocked',
    badge: 'error' as const,
    description: team.blockedReason
      ? `This team is blocked: ${team.blockedReason}.`
      : 'This team is blocked.',
  }
}

async function confirmStripeProjectsLink(formData: FormData) {
  'use server'

  const accountRequestId = String(formData.get('accountRequestId') ?? '')
  const confirmationSecret = String(formData.get('confirmationSecret') ?? '')
  const selectedTeamRef = String(formData.get('teamRef') ?? '')
  const newTeamName = String(formData.get('newTeamName') ?? '').trim()

  if (!accountRequestId || !confirmationSecret) {
    throw new Error('Missing Stripe Projects account request')
  }

  const supabase = await createClient()
  const session = await getSessionInsecure(supabase)
  if (!session?.access_token) {
    const returnTo = `/stripe-projects/link?${new URLSearchParams({
      account_request_id: accountRequestId,
      confirmation_secret: confirmationSecret,
    }).toString()}`

    redirect(`${AUTH_URLS.SIGN_IN}?${new URLSearchParams({ returnTo })}`)
  }

  let [teamId, teamSlug] = selectedTeamRef.split(':', 2)

  if (newTeamName) {
    const createResult = await createUserTeamsRepository({
      accessToken: session.access_token,
    }).createTeam(newTeamName)

    if (!createResult.ok) {
      throw new Error(createResult.error.message)
    }

    teamId = createResult.data.id
    teamSlug = createResult.data.slug
  }

  if (!teamId) {
    throw new Error('Select a team or create a new one')
  }

  const response = await fetch(
    `${infraAPIBaseURL()}/provisioning/account_requests/${encodeURIComponent(
      accountRequestId
    )}/confirm_dashboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      body: JSON.stringify({
        confirmation_secret: confirmationSecret,
        team_id: teamId,
      }),
      cache: 'no-store',
    }
  )

  const body = (await response
    .json()
    .catch(() => null)) as ConfirmResponse | null
  if (!response.ok || body?.error) {
    throw new Error(body?.error ?? 'Failed to link Stripe Projects')
  }

  redirect(PROTECTED_URLS.SANDBOXES_LIST(teamSlug || teamId))
}

export default async function StripeProjectsLinkPage({
  searchParams,
}: {
  searchParams: StripeProjectsLinkSearchParams
}) {
  const {
    account_request_id: accountRequestId,
    confirmation_secret: confirmationSecret,
  } = await searchParams

  if (!accountRequestId || !confirmationSecret) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  const supabase = await createClient()
  const session = await getSessionInsecure(supabase)

  if (!session?.access_token) {
    const returnTo = `/stripe-projects/link?${new URLSearchParams({
      account_request_id: accountRequestId,
      confirmation_secret: confirmationSecret,
    }).toString()}`

    redirect(`${AUTH_URLS.SIGN_IN}?${new URLSearchParams({ returnTo })}`)
  }

  const teamsResult = await createUserTeamsRepository({
    accessToken: session.access_token,
  }).listUserTeams()

  if (!teamsResult.ok) {
    throw new Error(teamsResult.error.message)
  }

  const teams = teamsResult.data
  const defaultTeam = teams.find((team) => team.isDefault) ?? teams[0]
  const hasTeams = teams.length > 0

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-medium tracking-normal">
            Link Stripe Projects
          </h1>
          <p className="text-fg-secondary text-sm leading-6">
            Choose the E2B team Stripe Projects should use when provisioning
            sandboxes.
          </p>
        </header>

        <form action={confirmStripeProjectsLink} className="space-y-6">
          <input
            type="hidden"
            name="accountRequestId"
            value={accountRequestId}
          />
          <input
            type="hidden"
            name="confirmationSecret"
            value={confirmationSecret}
          />

          {hasTeams && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Existing E2B team</legend>
              <div className="divide-border overflow-hidden rounded-md border">
                {teams.map((team) => {
                  const paymentState = paymentStateForTeam(team)

                  return (
                    <label
                      key={team.id}
                      className="hover:bg-bg-1 flex cursor-pointer items-start justify-between gap-4 px-4 py-4 text-sm"
                    >
                      <span className="min-w-0 space-y-2">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{team.name}</span>
                          <Badge variant={paymentState.badge} size="md">
                            {paymentState.label}
                          </Badge>
                          {team.isDefault && (
                            <Badge variant="default" size="md">
                              Default
                            </Badge>
                          )}
                        </span>
                        <span className="text-fg-tertiary block font-mono">
                          {team.slug}
                        </span>
                        <span className="text-fg-secondary block leading-5">
                          {paymentState.description}
                        </span>
                      </span>
                      <input
                        className="mt-1"
                        type="radio"
                        name="teamRef"
                        value={`${team.id}:${team.slug}`}
                        defaultChecked={team.id === defaultTeam?.id}
                      />
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="border-stroke bg-bg-1 space-y-3 rounded-md border p-4">
            <label htmlFor="newTeamName" className="text-sm font-medium">
              New E2B team
            </label>
            <p className="text-fg-secondary text-sm leading-5">
              Create a team for this Stripe Projects connection.
            </p>
            <Input
              id="newTeamName"
              name="newTeamName"
              placeholder="Team name"
              autoComplete="organization"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-fg-tertiary text-xs leading-5">
              Creating a team overrides the selected existing team.
            </p>
            <Button type="submit">Link Stripe Projects</Button>
          </div>
        </form>
      </div>
    </main>
  )
}
