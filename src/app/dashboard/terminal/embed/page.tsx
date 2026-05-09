import Link from 'next/link'
import type { Metadata } from 'next/types'
import { INCLUDE_IN_APP_TERMINAL } from '@/configs/flags'
import { AUTH_URLS } from '@/configs/urls'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { DashboardContextProvider } from '@/features/dashboard/context'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'
import { Button } from '@/ui/primitives/button'

export const metadata: Metadata = {
  title: 'Terminal - E2B',
  robots: 'noindex, nofollow',
}

interface TerminalEmbedPageProps {
  searchParams: Promise<{
    command?: string
    template?: string
  }>
}

export default async function TerminalEmbedPage({
  searchParams,
}: TerminalEmbedPageProps) {
  const { command = '', template } = await searchParams
  const terminalTemplate = normalizeTerminalTemplate(template)

  if (!INCLUDE_IN_APP_TERMINAL) {
    return (
      <TerminalEmbedUnavailable message="The in-app terminal is not enabled for this deployment." />
    )
  }

  if (!terminalTemplate) {
    return (
      <TerminalEmbedUnavailable message="The terminal template is invalid." />
    )
  }

  const session = await getSessionInsecure()
  const { data, error } = await getUserByToken(session?.access_token)

  if (error || !data.user || !session) {
    return <TerminalEmbedSignIn command={command} />
  }

  const teamsRepository = createUserTeamsRepository({
    accessToken: session.access_token,
  })
  const teamsResult = await teamsRepository.listUserTeams()
  const resolvedTeam = await resolveUserTeam(data.user.id, session.access_token)

  if (!teamsResult.ok || !resolvedTeam) {
    return <TerminalEmbedUnavailable />
  }

  const team = teamsResult.data.find(
    (candidate) => candidate.id === resolvedTeam.id
  )

  if (!team) {
    return <TerminalEmbedUnavailable />
  }

  const templateAvailable = await isTerminalTemplateAvailable({
    accessToken: session.access_token,
    teamId: team.id,
    template: terminalTemplate,
  })

  if (!templateAvailable.ok) {
    return (
      <TerminalEmbedUnavailable message="We could not verify the terminal template for this account." />
    )
  }

  if (!templateAvailable.available) {
    return (
      <TerminalEmbedUnavailable
        message={`Template "${terminalTemplate}" is not available for this account.`}
      />
    )
  }

  return (
    <DashboardContextProvider
      initialTeam={team}
      initialTeams={teamsResult.data}
      initialUser={data.user}
    >
      <main className="h-dvh min-h-[360px] bg-bg p-3">
        <DashboardTerminal
          autoStart
          initialCommand={command}
          initialTemplate={terminalTemplate}
          variant="embedded"
        />
      </main>
    </DashboardContextProvider>
  )
}

async function isTerminalTemplateAvailable({
  accessToken,
  teamId,
  template,
}: {
  accessToken: string
  teamId: string
  template: string
}) {
  if (template === 'base') {
    return { ok: true as const, available: true }
  }

  const defaultTemplatesRepository = createDefaultTemplatesRepository({
    accessToken,
  })
  const teamTemplatesRepository = createTemplatesRepository({
    accessToken,
    teamId,
  })
  const [defaultTemplates, teamTemplates] = await Promise.all([
    defaultTemplatesRepository.getDefaultTemplatesCached(),
    teamTemplatesRepository.getTeamTemplates(),
  ])

  if (!defaultTemplates.ok || !teamTemplates.ok) {
    return { ok: false as const }
  }

  const templates = [
    ...defaultTemplates.data.templates,
    ...teamTemplates.data.templates,
  ]

  return {
    ok: true as const,
    available: templates.some((candidate) =>
      [
        candidate.templateID,
        ...(candidate.aliases ?? []),
        ...(candidate.names ?? []),
      ].includes(template)
    ),
  }
}

function TerminalEmbedSignIn({ command }: { command: string }) {
  const returnTo = `/dashboard/terminal/embed${
    command
      ? `?${new URLSearchParams({
          command,
        }).toString()}`
      : ''
  }`
  const signInHref = `${AUTH_URLS.SIGN_IN}?${new URLSearchParams({
    returnTo,
  }).toString()}`

  return (
    <main className="flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div>
          <h1 className="text-lg font-medium">Sign in to open a terminal</h1>
          <p className="text-fg-secondary mt-2 text-sm">
            The terminal runs in your E2B dashboard account.
          </p>
        </div>
        <Button asChild>
          <Link href={signInHref} target="_top">
            Sign in
          </Link>
        </Button>
      </div>
    </main>
  )
}

function TerminalEmbedUnavailable({
  message = 'We could not resolve a dashboard team for this account.',
}: {
  message?: string
}) {
  return (
    <main className="flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-medium">Terminal unavailable</h1>
        <p className="text-fg-secondary mt-2 text-sm">{message}</p>
      </div>
    </main>
  )
}
