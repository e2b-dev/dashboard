import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { serializeError } from 'serialize-error'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { COOKIE_KEYS } from '@/configs/cookies'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createClient } from '@/lib/clients/supabase/server'
import { SandboxIdSchema } from '@/lib/schemas/api'
import { setTeamCookies } from '@/lib/utils/cookies'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const maxDuration = 60

interface InspectSandboxRouteContext {
  params: Promise<{
    sandboxId: string
  }>
}

interface UserTeam {
  id: string
  slug: string
}

function redirectToDashboardWithWarning(
  request: NextRequest,
  logKey: string,
  context: Record<string, unknown> = {}
): NextResponse {
  l.warn({
    key: logKey,
    ...context,
  })
  return NextResponse.redirect(
    new URL(PROTECTED_URLS.DASHBOARD, request.nextUrl.origin)
  )
}

function redirectToSignInPage(request: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL(AUTH_URLS.SIGN_IN, request.nextUrl.origin)
  )
}

async function hasSandboxInTeam(
  sandboxId: string,
  teamId: string,
  accessToken: string
): Promise<boolean> {
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

    return result.response?.status === 200 && Boolean(result.data)
  } catch (error) {
    if (error instanceof Error && !error.message.includes('404')) {
      l.error({
        key: 'find_sandbox_in_team:error',
        error,
        sandbox_id: sandboxId,
        team_id: teamId,
      })
    }
    return false
  }
}

async function resolveTeamForSandbox(
  sandboxId: string,
  userTeams: UserTeam[],
  preferredTeamId: string | undefined,
  accessToken: string
) {
  if (preferredTeamId) {
    const preferredTeam = userTeams.find((team) => team.id === preferredTeamId)
    if (
      preferredTeam &&
      (await hasSandboxInTeam(sandboxId, preferredTeamId, accessToken))
    ) {
      return preferredTeam
    }
  }

  for (const team of userTeams) {
    if (team.id === preferredTeamId) {
      continue
    }

    if (await hasSandboxInTeam(sandboxId, team.id, accessToken)) {
      return team
    }
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: InspectSandboxRouteContext
): Promise<NextResponse> {
  let requestedSandboxId: string | undefined

  try {
    const routeParams = await params
    requestedSandboxId = routeParams.sandboxId

    const parsedSandboxId = SandboxIdSchema.safeParse(requestedSandboxId)
    if (!parsedSandboxId.success) {
      return redirectToDashboardWithWarning(
        request,
        'inspect_sandbox:invalid_id',
        {
          sandbox_id: requestedSandboxId,
          validation_errors: parsedSandboxId.error.flatten(),
        }
      )
    }

    const sandboxId = parsedSandboxId.data
    const supabase = await createClient()
    const { data: userResponse, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userResponse.user) {
      l.info({
        key: 'inspect_sandbox:unauthenticated',
        sandbox_id: sandboxId,
        error: userError,
      })
      return redirectToSignInPage(request)
    }

    const userId = userResponse.user.id
    const { data: sessionResponse, error: sessionError } =
      await supabase.auth.getSession()

    if (sessionError || !sessionResponse.session) {
      l.warn({
        key: 'inspect_sandbox:session_error',
        user_id: userId,
        sandbox_id: sandboxId,
        error: sessionError,
      })
      return redirectToSignInPage(request)
    }

    const accessToken = sessionResponse.session.access_token
    const { data: userTeamRows, error: teamQueryError } = await supabaseAdmin
      .from('users_teams')
      .select('teams!inner(id, slug)')
      .eq('user_id', userId)

    if (teamQueryError || !userTeamRows || userTeamRows.length === 0) {
      l.warn({
        key: 'inspect_sandbox:teams_fetch_error',
        user_id: userId,
        sandbox_id: sandboxId,
        error: teamQueryError,
      })

      return redirectToDashboardWithWarning(
        request,
        'inspect_sandbox:no_teams',
        {
          user_id: userId,
          sandbox_id: sandboxId,
        }
      )
    }

    const userTeams: UserTeam[] = userTeamRows.map((row) => ({
      id: row.teams.id,
      slug: row.teams.slug,
    }))

    const cookieStore = await cookies()
    const preferredTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
    const selectedTeam = await resolveTeamForSandbox(
      sandboxId,
      userTeams,
      preferredTeamId,
      accessToken
    )

    if (!selectedTeam) {
      return redirectToDashboardWithWarning(
        request,
        'inspect_sandbox:not_found',
        {
          user_id: userId,
          sandbox_id: sandboxId,
          teams_checked: userTeams.map((team) => team.id),
        }
      )
    }

    const redirectUrl = new URL(
      PROTECTED_URLS.SANDBOX_INSPECT(selectedTeam.slug, sandboxId),
      request.url
    )

    await setTeamCookies(selectedTeam.id, selectedTeam.slug)

    l.info(
      {
        key: 'inspect_sandbox_route_handler:success',
        user_id: userId,
        sandbox_id: sandboxId,
        team_id: selectedTeam.id,
        context: {
          redirect_url: redirectUrl.pathname,
          team_slug: selectedTeam.slug,
        },
      },
      `INSPECT_SANDBOX_ROUTE_HANDLER: Redirecting to ${redirectUrl.pathname}`
    )

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    const serializedError = serializeError(error)
    const errorMessage =
      typeof serializedError === 'object' &&
      serializedError !== null &&
      'message' in serializedError
        ? String(serializedError.message)
        : 'Unknown error'

    l.error(
      {
        key: 'inspect_sandbox_route_handler:unexpected_error',
        error: serializedError,
        sandbox_id: requestedSandboxId,
      },
      `INSPECT_SANDBOX_ROUTE_HANDLER: Unexpected error: ${errorMessage}`
    )

    return redirectToDashboardWithWarning(
      request,
      'inspect_sandbox:unexpected_error',
      {
        sandbox_id: requestedSandboxId,
      }
    )
  }
}
