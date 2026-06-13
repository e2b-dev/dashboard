import { notFound } from 'next/navigation'
import { INCLUDE_AGENTS_IN_DASHBOARD } from '@/configs/flags'
import { PROTECTED_URLS } from '@/configs/urls'
import { TerminalLaunchPage } from '@/features/dashboard/terminal/terminal-launch-page'

export default async function AgentTerminalPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamSlug]/agents/terminal'>) {
  if (!INCLUDE_AGENTS_IN_DASHBOARD) {
    notFound()
  }

  const [{ teamSlug }, { command, new: forceNew, sandboxId, template }] =
    await Promise.all([params, searchParams])

  return (
    <TerminalLaunchPage
      backHref={PROTECTED_URLS.AGENTS(teamSlug)}
      command={getQueryValue(command) ?? ''}
      embedded
      forceNewSandbox={getQueryValue(forceNew) === '1'}
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
