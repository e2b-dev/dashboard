import { notFound } from 'next/navigation'
import { INCLUDE_AGENTS_IN_DASHBOARD } from '@/configs/flags'
import { Page } from '@/features/dashboard/layouts/page'
import { Badge } from '@/ui/primitives/badge'

const AGENT_TEMPLATES = [
  {
    name: 'Codex',
    command: 'codex',
    templateId: 'codex',
    description: 'Ubuntu template with Codex installed for coding sessions.',
  },
  {
    name: 'Claude',
    command: 'claude',
    templateId: 'claude',
    description:
      'Ubuntu template with Claude Code installed for coding sessions.',
  },
  {
    name: 'OpenCode',
    command: 'opencode',
    templateId: 'opencode',
    description: 'Ubuntu template with OpenCode installed for coding sessions.',
  },
]

export default async function AgentsPage() {
  if (!INCLUDE_AGENTS_IN_DASHBOARD) {
    notFound()
  }

  return (
    <Page className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="prose-title text-fg">Agent templates</h2>
        <p className="prose-body text-fg-tertiary max-w-2xl">
          Sandbox templates for running AI coding agents in Ubuntu environments.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {AGENT_TEMPLATES.map((template) => (
          <div
            className="border-stroke bg-bg-1 flex min-h-44 flex-col justify-between rounded-lg border p-4"
            key={template.name}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="prose-body-highlight text-fg">
                    {template.name}
                  </h3>
                  <code className="prose-code text-fg-tertiary">
                    {template.command}
                  </code>
                </div>
                <Badge variant="info">Template</Badge>
              </div>

              <p className="prose-body text-fg-tertiary">
                {template.description}
              </p>
            </div>

            <div className="border-stroke mt-4 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-fg-tertiary prose-label uppercase">
                Ubuntu
              </span>
              <code className="prose-code text-fg-tertiary">
                {template.templateId}
              </code>
            </div>
          </div>
        ))}
      </div>

      <div className="border-stroke bg-bg-1 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <h3 className="prose-body-highlight text-fg">No active sessions</h3>
          <p className="prose-body text-fg-tertiary">
            Agent sessions will appear here once a template is connected to a
            sandbox.
          </p>
        </div>
      </div>
    </Page>
  )
}
