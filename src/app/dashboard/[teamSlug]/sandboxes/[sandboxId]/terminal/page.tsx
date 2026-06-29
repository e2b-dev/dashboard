import { redirect } from 'next/navigation'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import SandboxTerminalView from '@/features/dashboard/sandbox/terminal/view'

interface SandboxTerminalPageProps {
  params: Promise<{
    teamSlug: string
  }>
  searchParams: Promise<{
    command?: string
  }>
}

export default async function SandboxTerminalPage({
  params,
  searchParams,
}: SandboxTerminalPageProps) {
  const [{ teamSlug }, { command = '' }, authContext] = await Promise.all([
    params,
    searchParams,
    getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)
  if (!teamId.ok) {
    throw new Error('Failed to resolve team for sandbox terminal')
  }
  if (!teamId.data) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  return <SandboxTerminalView command={command} userId={authContext.user.id} />
}
