import 'server-cli-only'

import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { NextRequest, NextResponse } from 'next/server'

// /**
//  * Core function to resolve team ID and ensure access for dashboard routes.
//  * Handles both direct team ID access and default team resolution.
//  */
// export async function resolveTeamForDashboard(
//   request: NextRequest,
//   userId: string
// ): Promise<{
//   teamId?: string
//   teamSlug?: string
//   redirect?: string
//   allowAccess?: boolean
// }> {
//   // Check for tab query parameter - skip default redirects if present
//   const hasTabParam = request.nextUrl.searchParams.has('tab')

//   if (request.nextUrl.pathname === PROTECTED_URLS.NEW_TEAM) {
//     return { allowAccess: true }
//   }

//   const segments = request.nextUrl.pathname.split('/')
//   const teamIdOrSlug = segments.length > 2 ? segments[2] : null
//   const currentTeamId = request.cookies.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
//   const currentTeamSlug = request.cookies.get(
//     COOKIE_KEYS.SELECTED_TEAM_SLUG
//   )?.value

//   if (teamIdOrSlug && teamIdOrSlug !== 'account') {
//     try {
//       const teamId = await resolveTeamId(teamIdOrSlug)
//       const hasAccess = await checkUserTeamAccess(userId, teamId)

//       if (!hasAccess) {
//         return { redirect: PROTECTED_URLS.DASHBOARD }
//       }

// const isUuid = z.uuid().safeParse(teamIdOrSlug).success
// const teamSlug = isUuid
//   ? (await kv.get<string>(KV_KEYS.TEAM_ID_TO_SLUG(teamId))) || undefined
//   : teamIdOrSlug || undefined

//       return { teamId, teamSlug }
//     } catch (error) {
//       return { redirect: PROTECTED_URLS.DASHBOARD }
//     }
//   }

//   if (currentTeamId) {
//     const hasAccess = await checkUserTeamAccess(userId, currentTeamId)

//     if (hasAccess) {
//       const teamSlug =
//         currentTeamSlug ||
//         (await kv.get<string>(KV_KEYS.TEAM_ID_TO_SLUG(currentTeamId))) ||
//         undefined

//       // Skip redirect if we're at /dashboard with a tab parameter
//       if (
//         hasTabParam &&
//         request.nextUrl.pathname === PROTECTED_URLS.DASHBOARD
//       ) {
//         return {
//           teamId: currentTeamId,
//           teamSlug,
//           // No redirect here - we'll let the page handle the tab parameter
//           // This case is handled by @/app/dashboard/route.ts
//         }
//       }

//       return {
//         teamId: currentTeamId,
//         teamSlug,
//         redirect:
//           teamIdOrSlug === 'account'
//             ? undefined
//             : PROTECTED_URLS.SANDBOXES(teamSlug || currentTeamId),
//       }
//     }
//   }

//   const { data: teamsData, error: teamsError } = await supabaseAdmin
//     .from('users_teams')
//     .select(
//       `
//       team_id,
//       is_default,
//       team:teams(*)
//     `
//     )
//     .eq('user_id', userId)

//   if (teamsError) {
//     return { redirect: '/' }
//   }

//   if (!teamsData?.length) {
//     return {
//       redirect: PROTECTED_URLS.NEW_TEAM,
//     }
//   }

//   const defaultTeam = teamsData.find((t) => t.is_default) || teamsData[0]!

//   // Skip redirect if we're at /dashboard with a tab parameter
//   if (hasTabParam && request.nextUrl.pathname === PROTECTED_URLS.DASHBOARD) {
//     return {
//       teamId: defaultTeam.team_id,
//       teamSlug: defaultTeam.team?.slug || undefined,
//       // No redirect here - we'll let the page handle the tab parameter
//     }
//   }

//   return {
//     teamId: defaultTeam.team_id,
//     teamSlug: defaultTeam.team?.slug || undefined,
//     redirect:
//       teamIdOrSlug === 'account'
//         ? undefined
//         : PROTECTED_URLS.SANDBOXES(
//             defaultTeam.team?.slug || defaultTeam.team_id
//           ),
//   }
// }

export function isAuthRoute(pathname: string): boolean {
  return (
    pathname.includes(AUTH_URLS.SIGN_IN) ||
    pathname.includes(AUTH_URLS.SIGN_UP) ||
    pathname.includes(AUTH_URLS.FORGOT_PASSWORD)
  )
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_URLS.DASHBOARD)
}

export function buildRedirectUrl(path: string, request: NextRequest): URL {
  return new URL(path, request.url)
}

export function getAuthRedirect(
  request: NextRequest,
  isAuthenticated: boolean
): NextResponse | null {
  if (isDashboardRoute(request.nextUrl.pathname) && !isAuthenticated) {
    return NextResponse.redirect(buildRedirectUrl(AUTH_URLS.SIGN_IN, request))
  }

  if (isAuthRoute(request.nextUrl.pathname) && isAuthenticated) {
    return NextResponse.redirect(
      buildRedirectUrl(PROTECTED_URLS.DASHBOARD, request)
    )
  }

  return null
}
