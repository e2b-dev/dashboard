import Link from 'next/link'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS } from '@/configs/urls'
import type { TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'
import { getAuthContext } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { infra } from '@/core/shared/clients/api'
import { createSandboxManagementAuth } from '@/core/shared/sandbox-management-auth.server'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import { Button } from '@/ui/primitives/button'
import DashboardTerminal from './dashboard-terminal'
import { normalizeTerminalTemplate } from './template'

interface TerminalLaunchPageProps {
  backHref?: string
  command?: string
  embedded?: boolean
  forceNewSandbox?: boolean
  returnToPath?: string
  sandboxId?: string
  teamSlug?: string
  template?: string
}

export async function TerminalLaunchPage({
  backHref,
  command = '',
  embedded = false,
  forceNewSandbox = false,
  returnToPath = '/dashboard/terminal',
  sandboxId,
  teamSlug,
  template,
}: TerminalLaunchPageProps) {
  const terminalTemplate = normalizeTerminalTemplate(template)
  const terminalSandboxId = normalizeTerminalSandboxId(sandboxId)

  if (!terminalTemplate) {
    return (
      <TerminalUnavailable
        embedded={embedded}
        message="The terminal template is invalid."
      />
    )
  }

  if (terminalSandboxId === null) {
    return (
      <TerminalUnavailable
        embedded={embedded}
        message="The terminal sandbox ID is invalid."
      />
    )
  }

  const authContext = await getAuthContext()

  if (!authContext) {
    return (
      <TerminalSignIn
        embedded={embedded}
        returnToPath={returnToPath}
        sandboxId={terminalSandboxId}
        template={terminalTemplate}
      />
    )
  }

  const teamsRepository = createUserTeamsRepository({
    accessToken: authContext.accessToken,
  })
  const teamsResult = await teamsRepository.listUserTeams()

  if (!teamsResult.ok) {
    return <TerminalUnavailable embedded={embedded} />
  }

  const team = teamSlug
    ? await resolveTerminalTeamBySlug({
        accessToken: authContext.accessToken,
        sandboxId: terminalSandboxId,
        teamSlug,
        teams: teamsResult.data,
      })
    : await resolveTerminalTeam({
        accessToken: authContext.accessToken,
        sandboxId: terminalSandboxId,
        teams: teamsResult.data,
        userId: authContext.user.id,
      })

  if (!team) {
    return (
      <TerminalUnavailable
        embedded={embedded}
        message={
          terminalSandboxId
            ? 'Sandbox not found or you do not have access to it.'
            : undefined
        }
      />
    )
  }

  const templateAvailable = terminalSandboxId
    ? { ok: true as const, available: true }
    : await isTerminalTemplateAvailable({
        accessToken: authContext.accessToken,
        teamId: team.id,
        template: terminalTemplate,
      })

  if (!templateAvailable.ok) {
    return (
      <TerminalUnavailable
        embedded={embedded}
        message="We could not verify the terminal template for this account."
      />
    )
  }

  if (!templateAvailable.available) {
    return (
      <TerminalUnavailable
        embedded={embedded}
        message={`Template "${terminalTemplate}" is not available for this account.`}
      />
    )
  }

  return (
    <main
      className={
        embedded ? 'h-full min-h-0 bg-bg' : 'h-dvh min-h-[360px] bg-bg p-3'
      }
    >
      <DashboardTerminal
        autoStart
        backHref={backHref}
        forceNewSandbox={forceNewSandbox}
        launchTarget={{
          command,
          sandboxId: terminalSandboxId,
          template: terminalTemplate,
        }}
        sandboxManagementAuth={createSandboxManagementAuth(
          authContext,
          team.id
        )}
        teamSlug={team.slug}
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

async function resolveTerminalTeam({
  accessToken,
  sandboxId,
  teams,
  userId,
}: {
  accessToken: string
  sandboxId?: string
  teams: TeamModel[]
  userId: string
}) {
  const resolvedTeam = await resolveUserTeam(userId, accessToken)

  if (sandboxId) {
    return resolveTerminalSandboxTeam({
      accessToken,
      preferredTeamId: resolvedTeam?.id,
      sandboxId,
      teams,
    })
  }

  return teams.find((candidate) => candidate.id === resolvedTeam?.id) ?? null
}

async function resolveTerminalTeamBySlug({
  accessToken,
  sandboxId,
  teamSlug,
  teams,
}: {
  accessToken: string
  sandboxId?: string
  teamSlug: string
  teams: TeamModel[]
}) {
  const team = teams.find((candidate) => candidate.slug === teamSlug)

  if (!team) {
    return null
  }

  if (!sandboxId) {
    return team
  }

  const ownsSandbox = await hasSandboxInTeam({
    accessToken,
    sandboxId,
    teamId: team.id,
  })

  return ownsSandbox ? team : null
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
        ...authHeaders(accessToken, teamId),
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

function TerminalSignIn({
  embedded,
  returnToPath,
  sandboxId,
  template,
}: {
  embedded: boolean
  returnToPath: string
  sandboxId?: string
  template: string
}) {
  const returnToParams = new URLSearchParams()

  if (template) {
    returnToParams.set('template', template)
  }

  if (sandboxId) {
    returnToParams.set('sandboxId', sandboxId)
  }

  const returnToQuery = returnToParams.toString()
  const returnTo = `${returnToPath}${returnToQuery ? `?${returnToQuery}` : ''}`
  const signInHref = `${AUTH_URLS.SIGN_IN}?${new URLSearchParams({
    returnTo,
  }).toString()}`

  return (
    <main
      className={
        embedded
          ? 'flex h-full min-h-0 items-center justify-center bg-bg p-6'
          : 'flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6'
      }
    >
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

function TerminalUnavailable({
  embedded,
  message = 'We could not resolve a dashboard team for this account.',
}: {
  embedded: boolean
  message?: string
}) {
  return (
    <main
      className={
        embedded
          ? 'flex h-full min-h-0 items-center justify-center bg-bg p-6'
          : 'flex h-dvh min-h-[360px] items-center justify-center bg-bg p-6'
      }
    >
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-medium">Terminal unavailable</h1>
        <p className="text-fg-secondary mt-2 text-sm">{message}</p>
      </div>
    </main>
  )
}
