import { redirect } from 'next/navigation'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { createClient } from '@/core/shared/clients/supabase/server'

type StripeProjectsLinkSearchParams = Promise<{
  account_request_id?: string
  confirmation_secret?: string
}>

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
  const team = teams.find((item) => item.isDefault) ?? teams[0]

  if (!team) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  redirect(
    `/dashboard/${team.slug}/stripe-projects/link?${new URLSearchParams({
      account_request_id: accountRequestId,
      confirmation_secret: confirmationSecret,
    }).toString()}`
  )
}
