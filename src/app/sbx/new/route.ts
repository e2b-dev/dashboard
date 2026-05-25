import Sandbox from 'e2b'
import { type NextRequest, NextResponse } from 'next/server'
import { authHeaders } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export const GET = async (req: NextRequest) => {
  try {
    const authContext = await auth.getAuthContext()

    if (!authContext) {
      const params = new URLSearchParams({
        returnTo: new URL(req.url).pathname,
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

    const sbx = await Sandbox.create('base', {
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      headers: {
        ...authHeaders(authContext.accessToken, team.id),
      },
    })

    const filesystemUrl = PROTECTED_URLS.SANDBOX_FILESYSTEM(
      team.slug,
      sbx.sandboxId
    )

    return NextResponse.redirect(new URL(filesystemUrl, req.url))
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
