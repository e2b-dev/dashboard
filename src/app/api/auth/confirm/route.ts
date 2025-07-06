import { AUTH_URLS, PROTECTED_URLS, BASE_URL } from '@/configs/urls'
import { logInfo, logError } from '@/lib/clients/logger'
import { createRouteClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'

const normalizeOrigin = (origin: string) => origin.replace('www.', '')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const supabaseTokenHash = searchParams.get('token_hash')
  const supabaseType = searchParams.get('type') as EmailOtpType | null
  const supabaseClientFlowUrl = searchParams.get('confirmation_url')

  const dashboardUrl = request.nextUrl
  const dashboardSignInUrl = new URL(request.nextUrl.origin + AUTH_URLS.SIGN_IN)

  const supabaseRedirectTo = searchParams.get('next')

  const isDifferentOrigin =
    supabaseRedirectTo &&
    normalizeOrigin(new URL(supabaseRedirectTo).origin) !==
      normalizeOrigin(dashboardUrl.origin)

  logInfo('AUTH_CONFIRM_INIT', {
    supabase_token_hash: supabaseTokenHash
      ? `${supabaseTokenHash.slice(0, 10)}...`
      : null,
    supabaseType,
    supabaseRedirectTo,
    isDifferentOrigin,
    supabaseClientFlowUrl,
    requestUrl: request.url,
    origin: request.nextUrl.origin,
  })

  if (
    !supabaseTokenHash ||
    !supabaseType ||
    !supabaseRedirectTo ||
    !supabaseClientFlowUrl
  ) {
    logError('AUTH_CONFIRM_INVALID_PARAMS', {
      supabaseTokenHash: !!supabaseTokenHash,
      supabaseType: !!supabaseType,
      supabaseRedirectTo: !!supabaseRedirectTo,
      supabaseClientFlowUrl: !!supabaseClientFlowUrl,
    })
    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Request'
    )
  }

  // when the next param is an absolute URL, with a different origin,
  // we need to redirect to the supabase client flow url
  if (isDifferentOrigin) {
    throw redirect(supabaseClientFlowUrl)
  }

  let redirectUrl: URL

  const next =
    supabaseType === 'recovery'
      ? PROTECTED_URLS.RESET_PASSWORD
      : (supabaseRedirectTo ?? PROTECTED_URLS.DASHBOARD)

  // try absolute url, else relative
  try {
    redirectUrl = new URL(next)
  } catch (e) {
    redirectUrl = new URL(request.nextUrl.origin + next)
  }

  if (!redirectUrl) {
    logError('AUTH_CONFIRM_INVALID_NEXT', {
      next,
    })
    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Next'
    )
  }

  logInfo('AUTH_CONFIRM_VERIFY', {
    supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
    supabaseType,
    next,
    redirectUrl: redirectUrl.toString(),
  })

  const response = NextResponse.redirect(redirectUrl)
  const supabase = createRouteClient(request, response)

  const { error } = await supabase.auth.verifyOtp({
    type: supabaseType,
    token_hash: supabaseTokenHash,
  })

  if (error) {
    logError('AUTH_CONFIRM_ERROR', {
      supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
      supabaseType,
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

    return encodedRedirect('error', dashboardSignInUrl.toString(), errorMessage)
  }

  logInfo('AUTH_CONFIRM_SUCCESS', {
    supabaseType,
    redirectUrl: redirectUrl.toString(),
  })

  return response
}
