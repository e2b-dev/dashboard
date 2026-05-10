import Link from 'next/link'
import type { Metadata } from 'next/types'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { AUTH_URLS } from '@/configs/urls'
import type { TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { infra } from '@/core/shared/clients/api'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'
import { Button } from '@/ui/primitives/button'

export const metadata: Metadata = {
  title: 'Terminal - E2B',
  robots: 'noindex, nofollow',
}

interface TerminalSessionPageProps {
  searchParams: Promise<{
    command?: string
    sandboxId?: string
    template?: string
  }>
}

export default async function TerminalSessionPage({
  searchParams,
}: TerminalSessionPageProps) {
  const { command = '', sandboxId, template } = await searchParams
  const terminalTemplate = normalizeTerminalTemplate(template)
  const terminalSandboxId = normalizeTerminalSandboxId(sandboxId)

  if (!terminalTemplate) {
    return (
      <TerminalSessionUnavailable message="The terminal template is invalid." />
    )
  }

  if (terminalSandboxId === null) {
    return (
      <TerminalSessionUnavailable message="The terminal sandbox ID is invalid." />
    )
  }

  const session = await getSessionInsecure()
  const { data, error } = await getUserByToken(session?.access_token)

  if (error || !data.user || !session) {
    return (
      <TerminalSessionSignIn
        command={command}
        sandboxId={terminalSandboxId}
        template={terminalTemplate}
      />
    )
  }

  const teamsRepository = createUserTeamsRepository({
    accessToken: session.access_token,
  })
  const teamsResult = await teamsRepository.listUserTeams()

  if (!teamsResult.ok) {
    return <TerminalSessionUnavailable />
  }

  const resolvedTeam = await resolveUserTeam(data.user.id, session.access_token)
  const team = terminalSandboxId
    ? await resolveTerminalSandboxTeam({
        accessToken: session.access_token,
        preferredTeamId: resolvedTeam?.id,
        sandboxId: terminalSandboxId,
        teams: teamsResult.data,
      })
    : teamsResult.data.find((candidate) => candidate.id === resolvedTeam?.id)

  if (!team) {
    return <TerminalSessionUnavailable />
  }

  const templateAvailable = terminalSandboxId
    ? { ok: true as const, available: true }
    : await isTerminalTemplateAvailable({
        accessToken: session.access_token,
        teamId: team.id,
        template: terminalTemplate,
      })

  if (!templateAvailable.ok) {
    return (
      <TerminalSessionUnavailable message="We could not verify the terminal template for this account." />
    )
  }

  if (!templateAvailable.available) {
    return (
      <TerminalSessionUnavailable
        message={`Template "${terminalTemplate}" is not available for this account.`}
      />
    )
  }

  return (
    <main className="h-dvh min-h-[360px] bg-bg p-3">
      <DashboardTerminal
        autoStart
        initialCommand={command}
        initialSandboxId={terminalSandboxId}
        initialTemplate={terminalTemplate}
        teamId={team.id}
      />
    </main>
  )
}

function normalizeTerminalSandboxId(sandboxId?: string) {
  const value = sandboxId?.trim()
  if (!value) return undefined

  const parsedSandboxId = SandboxIdSchema.safeParse(value)
  return parsedSandboxId.success ? parsedSandboxId.data : null
}

async function resolveTerminalSandboxTeam({
  accessToken,
  preferredTeamId,
  sandboxId,
  teams,
}: {
  accessToken: string
  preferredTeamId?: string
  sandboxId: string
  teams: TeamModel[]
}) {
  if (preferredTeamId) {
    const preferredTeam = teams.find((team) => team.id === preferredTeamId)
    if (
      preferredTeam &&
      (await hasSandboxInTeam({
        accessToken,
        sandboxId,
        teamId: preferredTeam.id,
      }))
    ) {
      return preferredTeam
    }
  }

  const candidateTeams = teams.filter((team) => team.id !== preferredTeamId)
  const teamMatches = await Promise.all(
    candidateTeams.map(async (team) => ({
      team,
      ownsSandbox: await hasSandboxInTeam({
        accessToken,
        sandboxId,
        teamId: team.id,
      }),
    }))
  )

  return teamMatches.find((match) => match.ownsSandbox)?.team ?? null
}

async function hasSandboxInTeam({
  accessToken,
  sandboxId,
  teamId,
}: {
  accessToken: string
  sandboxId: string
  teamId: string
}) {
  try {
    const result = await infra.GET('/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      cache: 'no-store',
    })

    return result.response.ok && Boolean(result.data)
  } catch {
    return false
  }
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

function TerminalSessionSignIn({
  command,
  sandboxId,
  template,
}: {
  command: string
  sandboxId?: string
  template: string
}) {
  const returnToParams = new URLSearchParams()

  if (template) {
    returnToParams.set('template', template)
  }

  if (command) {
    returnToParams.set('command', command)
  }

  if (sandboxId) {
    returnToParams.set('sandboxId', sandboxId)
  }

  const returnToQuery = returnToParams.toString()
  const returnTo = `/dashboard/terminal/session${
    returnToQuery ? `?${returnToQuery}` : ''
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

function TerminalSessionUnavailable({
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
