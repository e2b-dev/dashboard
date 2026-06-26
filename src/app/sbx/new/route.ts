import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'

export const GET = async (req: NextRequest) => {
  try {
    const requestUrl = new URL(req.url)
    const template = normalizeTerminalTemplate(
      requestUrl.searchParams.get('template') ?? undefined
    )

    if (!template) {
      return NextResponse.redirect(new URL(req.url).origin)
    }

    const authContext = await getAuthContext()

    if (!authContext) {
      const params = new URLSearchParams({
        returnTo: `${requestUrl.pathname}${requestUrl.search}`,
      })

      return NextResponse.redirect(
        new URL(`${AUTH_URLS.SIGN_IN}?${params.toString()}`, req.url)
      )
    }

    const team = await resolveUserTeam(
      authContext.user.id,
      authContext.accessToken
    )

    if (!team) {
      return NextResponse.redirect(new URL(req.url).origin)
    }

    const terminalParams = new URLSearchParams({ template })
    const command = requestUrl.searchParams.get('command')?.trim()

    if (command) {
      terminalParams.set('command', command)
    }

    const terminalUrl = PROTECTED_URLS.TERMINAL(team.slug)

    return NextResponse.redirect(
      new URL(`${terminalUrl}?${terminalParams.toString()}`, req.url)
    )
  } catch (error) {
    l.warn(
      {
        key: 'sbx_new:unexpected_error',
        error: serializeErrorForLog(error),
      },
      `sbx_new: unexpected error`
    )

    return NextResponse.redirect(new URL(req.url).origin)
  }
}
