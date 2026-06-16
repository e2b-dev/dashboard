import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_KEYS } from '@/configs/cookies'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { createSandboxManagementAuth } from '@/core/shared/sandbox-management-auth.server'
import SandboxInspectView from '@/features/dashboard/sandbox/inspect/view'

const DEFAULT_ROOT_PATH = '/home/user'

interface SandboxInspectPageProps {
  params: Promise<{
    sandboxId: string
    teamSlug: string
  }>
}

export default async function SandboxInspectPage({
  params,
}: SandboxInspectPageProps) {
  const [{ teamSlug }, cookieStore, authContext] = await Promise.all([
    params,
    cookies(),
    getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)
  if (!teamId.ok) {
    throw new Error('Failed to resolve team for sandbox filesystem')
  }
  if (!teamId.data) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  const rootPath =
    cookieStore.get(COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH)?.value ||
    DEFAULT_ROOT_PATH

  return (
    <SandboxInspectView
      rootPath={rootPath}
      sandboxManagementAuth={createSandboxManagementAuth(
        authContext,
        teamId.data
      )}
    />
  )
}
