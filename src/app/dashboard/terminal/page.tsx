import { redirect } from 'next/navigation'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import type { ResolvedTeam, TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getAuthContext } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { infra } from '@/core/shared/clients/api'
import { SandboxIdSchema } from '@/core/shared/schemas/api'

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
  const { command, sandboxId, template } = await searchParams
  const queryString = buildTerminalQueryString({ command, sandboxId, template })

  const authContext = await getAuthContext()

  if (!authContext) {
    const returnTo = `/dashboard/terminal${queryString ? `?${queryString}` : ''}`
    redirect(
      `${AUTH_URLS.SIGN_IN}?${new URLSearchParams({ returnTo }).toString()}`
    )
  }

  const resolvedTeam = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )
  const team = sandboxId
    ? await resolveSandboxTeam({
        accessToken: authContext.accessToken,
        preferredTeam: resolvedTeam,
        sandboxId,
      })
    : resolvedTeam

  if (!team) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  redirect(
    `${PROTECTED_URLS.TERMINAL(team.slug)}${
      queryString ? `?${queryString}` : ''
    }`
  )
}

function buildTerminalQueryString({
  command,
  sandboxId,
  template,
}: {
  command?: string
  sandboxId?: string
  template?: string
}) {
  const params = new URLSearchParams()

  if (command) params.set('command', command)
  if (template) params.set('template', template)
  if (sandboxId) params.set('sandboxId', sandboxId)

  return params.toString()
}

async function resolveSandboxTeam({
  accessToken,
  preferredTeam,
  sandboxId,
}: {
  accessToken: string
  preferredTeam: ResolvedTeam | null
  sandboxId: string
}) {
  const parsedSandboxId = SandboxIdSchema.safeParse(sandboxId.trim())
  if (!parsedSandboxId.success) return preferredTeam

  if (
    preferredTeam &&
    (await hasSandboxInTeam({
      accessToken,
      sandboxId: parsedSandboxId.data,
      teamId: preferredTeam.id,
    }))
  ) {
    return preferredTeam
  }

  const teamsRepository = createUserTeamsRepository({ accessToken })
  const teamsResult = await teamsRepository.listUserTeams()
  if (!teamsResult.ok) return null

  const candidateTeams = teamsResult.data.filter(
    (team) => team.id !== preferredTeam?.id
  )
  const teamMatches = await Promise.all(
    candidateTeams.map(async (team) => ({
      team,
      ownsSandbox: await hasSandboxInTeam({
        accessToken,
        sandboxId: parsedSandboxId.data,
        teamId: team.id,
      }),
    }))
  )

  const match = teamMatches.find(({ ownsSandbox }) => ownsSandbox)
  return match ? toResolvedTeam(match.team) : preferredTeam
}

function toResolvedTeam(team: TeamModel): ResolvedTeam | null {
  return team.slug
    ? {
        id: team.id,
        slug: team.slug,
      }
    : null
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
