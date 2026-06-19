import { type NextRequest, NextResponse } from 'next/server'
import { authHeaders } from '@/configs/api'
import { TAB_URL_MAP } from '@/configs/dashboard-tab-url-map'
import { PROTECTED_URLS } from '@/configs/urls'
import type { ResolvedTeam, TeamModel } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getAuthContext, signOut } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import { setTeamCookies } from '@/lib/utils/cookies'

const TERMINAL_REDIRECT_PARAM = '__terminal'
const LEGACY_DASHBOARD_TERMINAL_PATH = '/dashboard/terminal'

function getTabRedirectPath(tab: string | null, teamSlug: string) {
  if (tab && Object.hasOwn(TAB_URL_MAP, tab)) {
    const urlGenerator = TAB_URL_MAP[tab]

    if (urlGenerator) {
      return urlGenerator(teamSlug)
    }
  }

  return PROTECTED_URLS.SANDBOXES(teamSlug)
}

function buildTerminalQueryString(searchParams: URLSearchParams) {
  const params = new URLSearchParams()
  const command = searchParams.get('command')
  const sandboxId = searchParams.get('sandboxId')
  const template = searchParams.get('template')

  if (command) params.set('command', command)
  if (template) params.set('template', template)
  if (sandboxId) params.set('sandboxId', sandboxId)

  return params.toString()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')
  const shouldRedirectToTerminal =
    searchParams.get(TERMINAL_REDIRECT_PARAM) === '1' ||
    request.nextUrl.pathname.replace(/\/+$/, '') ===
      LEGACY_DASHBOARD_TERMINAL_PATH

  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const team = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )
  const redirectTeam =
    shouldRedirectToTerminal && searchParams.get('sandboxId')
      ? await resolveSandboxTeam({
          accessToken: authContext.accessToken,
          preferredTeam: team,
          sandboxId: searchParams.get('sandboxId') ?? '',
        })
      : team

  if (!redirectTeam) {
    if (shouldRedirectToTerminal) {
      return NextResponse.redirect(
        new URL(PROTECTED_URLS.DASHBOARD, request.url)
      )
    }

    l.warn(
      {
        key: 'dashboard:no_personal_team',
        user_id: authContext.user.id,
      },
      'no personal team for user, signing out'
    )

    const { redirectTo } = await signOut({
      origin: request.nextUrl.origin,
    })

    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  await setTeamCookies(redirectTeam.id, redirectTeam.slug)

  const redirectPath = shouldRedirectToTerminal
    ? PROTECTED_URLS.TERMINAL(redirectTeam.slug)
    : getTabRedirectPath(tab, redirectTeam.slug)

  const redirectUrl = new URL(redirectPath, request.url)

  if (shouldRedirectToTerminal) {
    const terminalQueryString = buildTerminalQueryString(searchParams)
    if (terminalQueryString) {
      redirectUrl.search = terminalQueryString
    }
  } else if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
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
