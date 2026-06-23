import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { createAgentsRepository } from '@/core/modules/agents/repository.server'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { AgentsList } from '@/features/dashboard/agents/agents-list'
import { Page } from '@/features/dashboard/layouts/page'

export const metadata: Metadata = {
  title: 'Agents - E2B',
}

type AgentsPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const [{ teamSlug }, authContext] = await Promise.all([
    params,
    getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)

  if (!teamId.ok || !teamId.data) {
    notFound()
  }

  const agentsEnabled = await featureFlags.isEnabled('agentsEnabled', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: {
      id: teamId.data,
      slug: teamSlug,
    },
  })

  if (!agentsEnabled) {
    notFound()
  }

  const agentsRepository = createAgentsRepository({
    accessToken: authContext.accessToken,
    teamId: teamId.data,
  })
  const agentsResult = await agentsRepository.listAgents()

  if (!agentsResult.ok) {
    throw new Error(agentsResult.error.message)
  }

  return (
    <Page className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="prose-title text-fg">Agents</h2>
        <p className="prose-body text-fg-tertiary max-w-2xl">
          Start a coding-agent sandbox and open it in the dashboard terminal.
        </p>
      </div>

      <AgentsList agents={agentsResult.data.agents} />
    </Page>
  )
}
