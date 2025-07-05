import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { logInfo } from '@/lib/clients/logger'
import { createRouteClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const signInUrl = new URL(request.nextUrl.origin + AUTH_URLS.SIGN_IN)

  const nextParam = searchParams.get('next')
  const isAbsoluteNext = !!nextParam && /^https?:\/\//i.test(nextParam)

  let next: string
  let redirectUrl: URL

  if (isAbsoluteNext) {
    // absolute URLs take precedence over any other rule
    next = nextParam as string
    redirectUrl = new URL(next)
  } else {
    // when recovering without an explicit next destination, force RESET_PASSWORD
    next =
      type === 'recovery' && (!nextParam || nextParam.trim() === '')
        ? PROTECTED_URLS.RESET_PASSWORD
        : (nextParam ?? PROTECTED_URLS.DASHBOARD)

    redirectUrl = new URL(request.nextUrl.origin + next)
  }

  if (!token_hash || !type)
    return encodedRedirect('error', signInUrl.toString(), 'Invalid Request')

  logInfo('AUTH_CONFIRM', {
    token_hash: token_hash.slice(0, 10) + '...',
    type,
    next,
    redirectUrl: redirectUrl.toString(),
  })

  const response = NextResponse.redirect(redirectUrl)
  const supabase = createRouteClient(request, response)

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error(
      'AUTH_CONFIRM',
      {
        token_hash: token_hash.slice(0, 10) + '...',
        type,
        next,
        redirectUrl: redirectUrl.toString(),
      },
      error
    )
    return encodedRedirect('error', signInUrl.toString(), 'Invalid Token')
  }

  return response
}
