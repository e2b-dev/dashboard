import { type NextRequest, NextResponse } from 'next/server'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import type { ResolvedTeam, TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getAuthContext } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { infra } from '@/core/shared/clients/api'
import { SandboxIdSchema } from '@/core/shared/schemas/api'

export async function GET(request: NextRequest) {
  const { command, sandboxId, template } = Object.fromEntries(
    request.nextUrl.searchParams
  )
  const queryString = buildTerminalQueryString({ command, sandboxId, template })

  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(
      new URL(
        `${AUTH_URLS.SIGN_IN}?${new URLSearchParams({
          returnTo: `${request.nextUrl.pathname}${request.nextUrl.search}`,
        }).toString()}`,
        request.url
      )
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
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  const terminalUrl = `${PROTECTED_URLS.TERMINAL(team.slug)}${
    queryString ? `?${queryString}` : ''
  }`

  return NextResponse.redirect(new URL(terminalUrl, request.url))
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
