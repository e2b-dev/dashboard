import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { logInfo, logError } from '@/lib/clients/logger'
import { createRouteClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const confirmationUrl = searchParams.get('confirmation_url')

  const signInUrl = new URL(request.nextUrl.origin + AUTH_URLS.SIGN_IN)

  const nextParam = searchParams.get('next')
  const isDifferentOrigin =
    nextParam && new URL(nextParam).hostname !== request.nextUrl.hostname

  let next: string
  let redirectUrl: URL

  logInfo('AUTH_CONFIRM_INIT', {
    token_hash: token_hash ? `${token_hash.slice(0, 10)}...` : null,
    type,
    nextParam,
    isDifferentOrigin,
    confirmationUrl,
    requestUrl: request.url,
    origin: request.nextUrl.origin,
  })

  if (isDifferentOrigin) {
    if (confirmationUrl) {
      logInfo('AUTH_CONFIRM_REDIRECT_CONFIRMATION', {
        confirmationUrl,
      })
      throw redirect(confirmationUrl)
    }
    next = nextParam as string
    redirectUrl = new URL(next)
  } else {
    next =
      type === 'recovery'
        ? PROTECTED_URLS.RESET_PASSWORD
        : (nextParam ?? PROTECTED_URLS.DASHBOARD)

    try {
      redirectUrl = new URL(next)
    } catch (e) {
      logInfo('AUTH_CONFIRM_URL_FALLBACK', {
        next,
        error: e instanceof Error ? e.message : String(e),
      })
      redirectUrl = new URL(request.nextUrl.origin + next)
    }
  }

  if (!token_hash || !type) {
    logError('AUTH_CONFIRM_INVALID_PARAMS', {
      token_hash: !!token_hash,
      type: !!type,
    })
    return encodedRedirect('error', signInUrl.toString(), 'Invalid Request')
  }

  logInfo('AUTH_CONFIRM_VERIFY', {
    token_hash: `${token_hash.slice(0, 10)}...`,
    type,
    next,
    redirectUrl: redirectUrl.toString(),
  })

  const response = NextResponse.redirect(redirectUrl)
  const supabase = createRouteClient(request, response)

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    logError('AUTH_CONFIRM_ERROR', {
      token_hash: `${token_hash.slice(0, 10)}...`,
      type,
      next,
      redirectUrl: redirectUrl.toString(),
      errorCode: error.code,
      errorStatus: error.status,
      errorMessage: error.message,
    })

    let errorMessage = 'Invalid Token'
    if (error.status === 403 && error.code === 'otp_expired') {
      errorMessage = 'Email link has expired. Please request a new one.'
    }

    return encodedRedirect('error', signInUrl.toString(), errorMessage)
  }

  logInfo('AUTH_CONFIRM_SUCCESS', {
    type,
    redirectUrl: redirectUrl.toString(),
  })

  return response
}
