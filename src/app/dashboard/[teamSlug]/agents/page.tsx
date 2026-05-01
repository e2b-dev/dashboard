import DevinAgentCard from '@/features/dashboard/agents/devin-agent-card'

export default function AgentsPage() {
  return (
    <main className="p-3 md:p-6">
      <div className="grid max-w-4xl min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DevinAgentCard />
      </div>
    </main>
  )
}
