import { notFound } from 'next/navigation'
import { INCLUDE_AGENTS_IN_DASHBOARD } from '@/configs/flags'
import { TerminalLaunchPage } from '@/features/dashboard/terminal/terminal-launch-page'

export default async function AgentTerminalPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamSlug]/agents/terminal'>) {
  if (!INCLUDE_AGENTS_IN_DASHBOARD) {
    notFound()
  }

  const { teamSlug } = await params
  const { command, sandboxId, template } = await searchParams

  return (
    <TerminalLaunchPage
      command={getQueryValue(command) ?? ''}
      embedded
      returnToPath={`/dashboard/${teamSlug}/agents/terminal`}
      sandboxId={getQueryValue(sandboxId)}
      teamSlug={teamSlug}
      template={getQueryValue(template)}
    />
  )
}

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
