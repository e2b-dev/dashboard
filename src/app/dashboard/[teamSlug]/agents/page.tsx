import { notFound } from 'next/navigation'
import { INCLUDE_AGENTS_IN_DASHBOARD } from '@/configs/flags'
import { Page } from '@/features/dashboard/layouts/page'
import { Badge } from '@/ui/primitives/badge'

const AGENT_HARNESSES = [
  {
    name: 'Codex',
    command: 'codex',
    description: 'OpenAI Codex harness for sandbox-backed coding sessions.',
  },
  {
    name: 'Claude',
    command: 'claude',
    description: 'Claude Code harness for sandbox-backed coding sessions.',
  },
  {
    name: 'OpenCode',
    command: 'opencode',
    description: 'OpenCode harness for sandbox-backed coding sessions.',
  },
]

export default async function AgentsPage() {
  if (!INCLUDE_AGENTS_IN_DASHBOARD) {
    notFound()
  }

  return (
    <Page className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="prose-title text-fg">Agent harnesses</h2>
        <p className="prose-body text-fg-tertiary max-w-2xl">
          Local development harnesses for running AI coding agents against E2B
          sandboxes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {AGENT_HARNESSES.map((harness) => (
          <div
            className="border-stroke bg-bg-1 flex min-h-44 flex-col justify-between rounded-lg border p-4"
            key={harness.name}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="prose-body-highlight text-fg">
                    {harness.name}
                  </h3>
                  <code className="prose-code text-fg-tertiary">
                    {harness.command}
                  </code>
                </div>
                <Badge variant="info">Harness</Badge>
              </div>

              <p className="prose-body text-fg-tertiary">
                {harness.description}
              </p>
            </div>

            <div className="border-stroke text-fg-tertiary prose-label mt-4 border-t pt-3 uppercase">
              Local only
            </div>
          </div>
        ))}
      </div>

      <div className="border-stroke bg-bg-1 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <h3 className="prose-body-highlight text-fg">No active sessions</h3>
          <p className="prose-body text-fg-tertiary">
            Agent sessions will appear here once a harness is connected to a
            sandbox.
          </p>
        </div>
      </div>
    </Page>
  )
}
