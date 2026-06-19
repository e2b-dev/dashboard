import Link from 'next/link'
import type { Metadata } from 'next/types'
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
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'
import { Button } from '@/ui/primitives/button'

export const metadata: Metadata = {
  title: 'Terminal - E2B',
  robots: 'noindex, nofollow',
}

interface TerminalPageProps {
  searchParams: Promise<{
    command?: string
    sandboxId?: string
    template?: string
  }>
}

export default async function TerminalPage({
  searchParams,
}: TerminalPageProps) {
  const { command = '', sandboxId, template } = await searchParams
  const terminalSandboxId = normalizeTerminalSandboxId(sandboxId)
  const requestedTemplate = normalizeTerminalTemplate(template)

  if (!terminalSandboxId && !requestedTemplate) {
    return <TerminalUnavailable message="The terminal template is invalid." />
  }

  if (terminalSandboxId === null) {
    return <TerminalUnavailable message="The terminal sandbox ID is invalid." />
  }

  const authContext = await getAuthContext()

  if (!authContext) {
    return (
      <TerminalSignIn
        sandboxId={terminalSandboxId}
        template={requestedTemplate ?? 'base'}
      />
    )
  }

  const teamsRepository = createUserTeamsRepository({
    accessToken: authContext.accessToken,
  })
  const teamsResult = await teamsRepository.listUserTeams()

  if (!teamsResult.ok) {
    return <TerminalUnavailable />
  }

  const resolvedTeam = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )
  const terminalSandbox = terminalSandboxId
    ? await resolveTerminalSandbox({
        accessToken: authContext.accessToken,
        preferredTeamId: resolvedTeam?.id,
        sandboxId: terminalSandboxId,
        teams: teamsResult.data,
      })
    : null
  const team = terminalSandbox
    ? terminalSandbox.team
    : teamsResult.data.find((candidate) => candidate.id === resolvedTeam?.id)
  const terminalTemplate = terminalSandbox?.template ?? requestedTemplate

  if (!team) {
    return (
      <TerminalUnavailable
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
        template: terminalTemplate ?? 'base',
      })

  if (!templateAvailable.ok) {
    return (
      <TerminalUnavailable message="We could not verify the terminal template for this account." />
    )
  }

  if (!templateAvailable.available) {
    return (
      <TerminalUnavailable
        message={`Template "${terminalTemplate}" is not available for this account.`}
      />
    )
  }

  return (
    <main className="h-dvh min-h-[360px] bg-bg p-3">
      <DashboardTerminal
        autoStart
        launchTarget={{
          command,
          sandboxId: terminalSandboxId,
          template: terminalTemplate ?? 'base',
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

async function resolveTerminalSandbox({
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
    if (preferredTeam) {
      const preferredSandbox = await getSandboxInTeam({
        accessToken,
        sandboxId,
        teamId: preferredTeam.id,
      })

      if (preferredSandbox) {
        return {
          team: preferredTeam,
          template: getSandboxTemplate(preferredSandbox),
        }
      }
    }
  }

  const candidateTeams = teams.filter((team) => team.id !== preferredTeamId)
  const teamMatches = await Promise.all(
    candidateTeams.map(async (team) => ({
      sandbox: await getSandboxInTeam({
        accessToken,
        sandboxId,
        teamId: team.id,
      }),
      team,
    }))
  )

  const match = teamMatches.find(({ sandbox }) => sandbox)

  return match?.sandbox
    ? {
        team: match.team,
        template: getSandboxTemplate(match.sandbox),
      }
    : null
}

type TerminalSandbox = {
  alias?: string
  templateID: string
}

function getSandboxTemplate(sandbox: TerminalSandbox) {
  return sandbox.alias ?? sandbox.templateID
}

async function getSandboxInTeam({
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

    return result.response.ok && result.data ? result.data : null
  } catch {
    return null
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
  sandboxId,
  template,
}: {
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
  const returnTo = `/dashboard/terminal${
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

function TerminalUnavailable({
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
