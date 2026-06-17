import type { Metadata } from 'next'
import { AgentsList } from '@/features/dashboard/agents/agents-list'
import { AGENT_TEMPLATES } from '@/features/dashboard/agents/config'
import { Page } from '@/features/dashboard/layouts/page'

export const metadata: Metadata = {
  title: 'Agents - E2B',
}

export default function AgentsPage() {
  return (
    <Page className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="prose-title text-fg">Agents</h2>
        <p className="prose-body text-fg-tertiary max-w-2xl">
          Start a coding-agent sandbox and open it in the dashboard terminal.
        </p>
      </div>

      <AgentsList agents={AGENT_TEMPLATES} />
    </Page>
  )
}
