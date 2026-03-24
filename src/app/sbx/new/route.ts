import Sandbox from 'e2b'
import { type NextRequest, NextResponse } from 'next/server'
import { serializeError } from 'serialize-error'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      const params = new URLSearchParams({
        returnTo: new URL(req.url).pathname,
      })

      return NextResponse.redirect(
        new URL(`${AUTH_URLS.SIGN_IN}?${params.toString()}`, req.url)
      )
    }

    const session = await getSessionInsecure(supabase)

    if (!session) {
      const params = new URLSearchParams({
        returnTo: new URL(req.url).pathname,
      })

      return NextResponse.redirect(
        new URL(`${AUTH_URLS.SIGN_IN}?${params.toString()}`, req.url)
      )
    }

    const team = await resolveUserTeam(session.access_token)

    if (!team) {
      return NextResponse.redirect(new URL(req.url).origin)
    }

    const sbx = await Sandbox.create('base', {
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, team.id),
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
        error: serializeError(error),
      },
      `sbx_new: unexpected error`
    )

    return NextResponse.redirect(new URL(req.url).origin)
  }
}
