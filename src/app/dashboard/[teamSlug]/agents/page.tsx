import { AgentsDashboard } from '@/features/dashboard/agents/agents-dashboard'
import { Page } from '@/features/dashboard/layouts/page'
import { HydrateClient, prefetch, trpc, trpcCaller } from '@/trpc/server'
import { requireAgentsDashboardAccess } from './access'

export default async function AgentsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/agents'>) {
  const { teamSlug } = await requireAgentsDashboardAccess(params)
  const { templates } = await trpcCaller.agents.getTemplates({ teamSlug })

  prefetch(
    trpc.sandboxes.getSandboxes.queryOptions({
      teamSlug,
    })
  )

  return (
    <HydrateClient>
      <Page className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="prose-title text-fg">Agent templates</h2>
          <p className="prose-body text-fg-tertiary max-w-2xl">
            Launch and reconnect coding-agent sandbox sessions.
          </p>
        </div>

        <AgentsDashboard templates={templates} teamSlug={teamSlug} />
      </Page>
    </HydrateClient>
  )
}
