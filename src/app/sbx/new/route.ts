import Sandbox from 'e2b'
import { type NextRequest, NextResponse } from 'next/server'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext } from '@/core/server/auth'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'

export const GET = async (req: NextRequest) => {
  try {
    const origin = resolvePublicOrigin(req.nextUrl.origin)
    const requestUrl = new URL(req.url)
    const template = normalizeTerminalTemplate(
      requestUrl.searchParams.get('template') ?? undefined
    )

    if (!template) {
      return NextResponse.redirect(origin)
    }

    const authContext = await getAuthContext()

    if (!authContext) {
      const params = new URLSearchParams({
        returnTo: `${requestUrl.pathname}${requestUrl.search}`,
      })

      return NextResponse.redirect(
        new URL(`${AUTH_URLS.SIGN_IN}?${params.toString()}`, origin)
      )
    }

    const team = await resolveUserTeam(
      authContext.user.id,
      authContext.accessToken
    )

    if (!team) {
      return NextResponse.redirect(origin)
    }

    const sbx = await Sandbox.create(template, {
      apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      apiHeaders: {
        ...authHeaders(authContext.accessToken, team.id),
      },
    })

    const terminalParams = new URLSearchParams({ template })
    const command = requestUrl.searchParams.get('command')?.trim()

    if (command) {
      terminalParams.set('command', command)
    }

    const terminalUrl = PROTECTED_URLS.SANDBOX_TERMINAL(
      team.slug,
      sbx.sandboxId
    )

    return NextResponse.redirect(
      new URL(`${terminalUrl}?${terminalParams.toString()}`, origin)
    )
  } catch (error) {
    l.warn(
      {
        key: 'sbx_new:unexpected_error',
        error: serializeErrorForLog(error),
      },
      `sbx_new: unexpected error`
    )

    return NextResponse.redirect(resolvePublicOrigin(req.nextUrl.origin))
  }
}
