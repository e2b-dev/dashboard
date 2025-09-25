/**
 * Sandbox Inspection Proxy Route
 *
 * This route provides a team-agnostic way to access sandbox inspection pages.
 * It automatically discovers which team owns a sandbox and redirects to the
 * appropriate team-scoped URL.
 *
 * Use Case: CLI tools and external integrations can generate URLs without
 * knowing the team context, simplifying URL generation and improving UX.
 *
 * Flow:
 * 1. Validate and sanitize the sandbox ID
 * 2. Authenticate the user
 * 3. Fetch user's teams with optimized query
 * 4. Search for sandbox ownership (cookie team first, then all teams)
 * 5. Resolve team slug and update cache
 * 6. Redirect to team-scoped inspection URL
 *
 * Security:
 * - Input validation with Zod
 * - Authentication required
 * - Team membership verification
 * - Sandbox ownership verification
 *
 * Performance:
 * - Redis caching for team slug mappings
 * - Cookie-based team preference for faster resolution
 * - Optimized database queries with selective field retrieval
 */

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { COOKIE_KEYS } from '@/configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createClient } from '@/lib/clients/supabase/server'
import { SandboxIdSchema } from '@/lib/schemas/api'
import { SandboxInfo } from '@/types/api'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { serializeError } from 'serialize-error'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const revalidate = 0
export const maxDuration = 60 // seconds

interface RouteParams {
  params: Promise<{
    sandboxId: string
  }>
}

interface MinimalTeam {
  id: string
  slug: string
  is_default?: boolean
}

interface SandboxSearchResult {
  team: MinimalTeam
  sandbox: SandboxInfo
}

/**
 * Creates a redirect response to the dashboard with error logging
 */
function redirectToDashboard(
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

/**
 * Creates a redirect response to sign-in page
 */
function redirectToSignIn(request: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL(AUTH_URLS.SIGN_IN, request.nextUrl.origin)
  )
}

/**
 * Attempts to find a sandbox in a specific team
 *
 * @param sandboxId - The ID of the sandbox to find
 * @param teamId - The team ID to search in
 * @param accessToken - User's access token for API authentication
 * @returns Promise with sandbox details if found, null otherwise
 */
async function findSandboxInTeam(
  sandboxId: string,
  teamId: string,
  accessToken: string
): Promise<SandboxInfo | null> {
  try {
    const res = await infra.GET('/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      cache: 'no-store', // always fetch fresh data for security
    })

    // only return sandbox data if request was successful
    if (res.response?.status === 200 && res.data) {
      return res.data
    }

    return null
  } catch (error) {
    // log non-404 errors as they might indicate infrastructure issues
    if (error instanceof Error && !error.message.includes('404')) {
      l.error({
        key: 'find_sandbox_in_team:error',
        error,
        sandbox_id: sandboxId,
        team_id: teamId,
      })
    }
    return null
  }
}

/**
 * Searches for a sandbox across all user's teams
 * Optimized to check cookie-selected team first for better performance
 *
 * @param sandboxId - The sandbox ID to search for
 * @param usersTeams - List of teams the user has access to
 * @param cookieTeamId - Team ID from user's cookies (if any)
 * @param accessToken - User's access token
 * @returns Search result with team and sandbox details if found
 */
async function searchSandboxInTeams(
  sandboxId: string,
  usersTeams: MinimalTeam[],
  cookieTeamId: string | undefined,
  accessToken: string
): Promise<SandboxSearchResult | null> {
  // optimization: try cookie team first if it exists
  // this handles the common case where user is working within one team
  if (cookieTeamId) {
    const cookieTeam = usersTeams.find((t) => t.id === cookieTeamId)
    if (cookieTeam) {
      const sandboxDetails = await findSandboxInTeam(
        sandboxId,
        cookieTeamId,
        accessToken
      )

      if (sandboxDetails) {
        return {
          team: cookieTeam,
          sandbox: sandboxDetails,
        }
      }
    }
  }

  // fall back to searching all teams
  // this handles team switching and first-time access scenarios
  for (const team of usersTeams) {
    // skip if we already checked this team above
    if (team.id === cookieTeamId) {
      continue
    }

    const sandboxDetails = await findSandboxInTeam(
      sandboxId,
      team.id,
      accessToken
    )

    if (sandboxDetails) {
      return {
        team: team,
        sandbox: sandboxDetails,
      }
    }
  }

  return null
}

/**
 * Updates user's team selection cookies for UI consistency
 *
 * @param response - NextResponse object to add cookies to
 * @param team - Selected team
 * @param teamSlug - Resolved team slug
 */
function updateTeamCookies(
  response: NextResponse,
  team: MinimalTeam,
  teamSlug: string
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  }

  // always set team ID cookie
  response.cookies.set(COOKIE_KEYS.SELECTED_TEAM_ID, team.id, cookieOptions)

  // only set slug cookie if it's different from ID
  if (teamSlug !== team.id) {
    response.cookies.set(
      COOKIE_KEYS.SELECTED_TEAM_SLUG,
      teamSlug,
      cookieOptions
    )
  }
}

/**
 * GET /dashboard/inspect/[sandboxId]
 *
 * Resolves sandbox ownership and redirects to appropriate team-scoped URL
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing sandbox ID
 * @returns Redirect response to team-scoped sandbox inspection page
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // validate and sanitize input

    const { sandboxId: rawSandboxId } = await params

    // validate sandbox ID format to prevent injection attacks
    const validationResult = SandboxIdSchema.safeParse(rawSandboxId)

    if (!validationResult.success) {
      return redirectToDashboard(request, 'inspect_sandbox:invalid_id', {
        sandbox_id: rawSandboxId,
        validation_errors: validationResult.error.flatten(),
      })
    }

    const sandboxId = validationResult.data

    // authenticate user

    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      l.info({
        key: 'inspect_sandbox:unauthenticated',
        sandbox_id: sandboxId,
        error: authError,
      })
      return redirectToSignIn(request)
    }

    const userId = authData.user.id

    // get session for API access token
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()

    if (sessionError || !sessionData.session) {
      l.warn({
        key: 'inspect_sandbox:session_error',
        user_id: userId,
        sandbox_id: sandboxId,
        error: sessionError,
      })
      return redirectToSignIn(request)
    }

    const accessToken = sessionData.session.access_token

    // fetch user's teams using supabaseAdmin

    const { data: usersTeamsData, error: teamsError } = await supabaseAdmin
      .from('users_teams')
      .select('is_default, teams!inner(id, slug)')
      .eq('user_id', userId)

    if (teamsError || !usersTeamsData || usersTeamsData.length === 0) {
      l.warn({
        key: 'inspect_sandbox:teams_fetch_error',
        user_id: userId,
        sandbox_id: sandboxId,
        error: teamsError,
      })

      return redirectToDashboard(request, 'inspect_sandbox:no_teams', {
        user_id: userId,
        sandbox_id: sandboxId,
      })
    }

    // transform to MinimalTeam format

    const usersTeams: MinimalTeam[] = usersTeamsData.map((userTeam) => ({
      id: userTeam.teams.id,
      slug: userTeam.teams.slug,
      is_default: userTeam.is_default,
    }))

    // get team preference from cookies for optimization

    const cookieStore = await cookies()
    const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value

    // search for sandbox across teams

    const searchResult = await searchSandboxInTeams(
      sandboxId,
      usersTeams,
      cookieTeamId,
      accessToken
    )

    if (!searchResult) {
      return redirectToDashboard(request, 'inspect_sandbox:not_found', {
        user_id: userId,
        sandbox_id: sandboxId,
        teams_checked: usersTeams.map((t) => t.id),
      })
    }

    // resolve team slug and prepare redirect

    const teamSlug = searchResult.team.slug

    const redirectUrl = new URL(
      PROTECTED_URLS.SANDBOX_INSPECT(teamSlug, sandboxId),
      request.url
    )

    const response = NextResponse.redirect(redirectUrl)

    // update cookies for UI consistency

    updateTeamCookies(response, searchResult.team, teamSlug)

    l.info(
      {
        key: 'inspect_sandbox_route_handler:success',
        user_id: userId,
        sandbox_id: sandboxId,
        team_id: searchResult.team.id,
        context: {
          redirect_url: redirectUrl.pathname,
          team_slug: teamSlug,
        },
      },
      `INSPECT_SANDBOX_ROUTE_HANDLER: Redirecting to ${redirectUrl.pathname}`
    )

    return response
  } catch (error) {
    // global error handler - ensures we never expose internal errors

    const sE = serializeError(error)
    const errorMessage =
      typeof sE === 'object' && sE !== null && 'message' in sE
        ? String(sE.message)
        : 'Unknown error'

    l.error(
      {
        key: 'inspect_sandbox_route_handler:unexpected_error',
        error: sE,
        sandbox_id: (await params).sandboxId,
      },
      `INSPECT_SANDBOX_ROUTE_HANDLER: Unexpected error: ${errorMessage}`
    )

    // always redirect to dashboard on unexpected errors for security
    return redirectToDashboard(request, 'inspect_sandbox:unexpected_error', {
      sandbox_id: (await params).sandboxId,
    })
  }
}
