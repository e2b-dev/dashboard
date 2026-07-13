import type { Metadata } from 'next'
import { BASE_URL } from '@/configs/urls'
import { isDevinOAuthConfigured } from '@/core/modules/devin-outposts/oauth.server'
import { DevinConnectionForm } from '@/features/dashboard/connections/devin-connection-form'
import { Page } from '@/features/dashboard/layouts/page'

export const metadata: Metadata = {
  title: 'Devin connection - E2B',
  robots: 'noindex, nofollow',
}

interface DevinConnectionPageProps {
  params: Promise<{ teamSlug: string }>
  searchParams: Promise<{ devinOAuth?: string | string[] }>
}

export default async function DevinConnectionPage({
  params,
  searchParams,
}: DevinConnectionPageProps) {
  const { teamSlug } = await params
  const { devinOAuth } = await searchParams
  const status = Array.isArray(devinOAuth) ? devinOAuth[0] : devinOAuth

  return (
    <Page>
      <DevinConnectionForm
        oauthEnabled={isDevinOAuthConfigured(BASE_URL)}
        oauthMessage={status ? oauthMessage(status) : undefined}
        teamSlug={teamSlug}
      />
    </Page>
  )
}

function oauthMessage(status: string) {
  switch (status) {
    case 'access':
      return 'This dashboard session cannot access the selected team.'
    case 'config':
      return 'Devin partner OAuth is not configured for this dashboard deployment.'
    case 'denied':
      return 'The Devin connection was not authorized.'
    case 'dashboard':
      return 'The dashboard could not verify team access. Try again.'
    case 'expired':
      return 'The Devin authorization expired or was already used. Start the connection again.'
    case 'invalid_state':
      return 'This Devin connection attempt is missing or expired. Start it again.'
    case 'in_progress':
      return 'A Devin authorization is already in progress in this browser. Finish that attempt or wait for it to expire.'
    case 'launch':
      return 'The Devin worker sandbox could not be prepared or started.'
    case 'provider':
      return 'Devin could not complete the connection. Try again.'
    case 'session':
      return 'Your dashboard session changed during authorization. Sign in and start again.'
    default:
      return 'The Devin connection did not complete. Start it again.'
  }
}
