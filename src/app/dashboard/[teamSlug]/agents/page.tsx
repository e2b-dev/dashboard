import { notFound } from 'next/navigation'
import { INCLUDE_IN_APP_TERMINAL } from '@/configs/flags'
import AgentLaunchCard from '@/features/dashboard/agents/agent-launch-card'
import { AGENT_LAUNCHERS } from '@/features/dashboard/agents/agent-launchers'

export default function AgentsPage() {
  if (!INCLUDE_IN_APP_TERMINAL) {
    notFound()
  }

  return (
    <main className="p-3 md:p-6">
      <div className="grid max-w-4xl min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENT_LAUNCHERS.map((agent) => (
          <AgentLaunchCard key={agent.name} agent={agent} />
        ))}
      </div>
    </main>
  )
}
