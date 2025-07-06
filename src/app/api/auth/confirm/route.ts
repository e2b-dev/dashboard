import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { logInfo, logError } from '@/lib/clients/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const confirmSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum([
    'signup',
    'recovery',
    'invite',
    'magiclink',
    'email',
    'email_change',
  ]),
  confirmation_url: z.string().url(),
  next: z.string().url(),
})

const normalizeOrigin = (origin: string) =>
  origin.replace('www.', '').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const result = confirmSchema.safeParse({
    token_hash: searchParams.get('token_hash'),
    type: searchParams.get('type'),
    confirmation_url: searchParams.get('confirmation_url'),
    next: searchParams.get('next'),
  })

  const dashboardSignInUrl = new URL(request.nextUrl.origin + AUTH_URLS.SIGN_IN)

  if (!result.success) {
    logError('AUTH_CONFIRM_INVALID_PARAMS', {
      errors: result.error.errors,
    })
    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Request'
    )
  }

  const supabaseTokenHash = result.data.token_hash
  const supabaseType = result.data.type
  const supabaseClientFlowUrl = result.data.confirmation_url
  const supabaseRedirectTo = result.data.next

  const dashboardUrl = request.nextUrl

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

  // when the next param is an absolute URL, with a different origin,
  // we need to redirect to the supabase client flow url
  if (isDifferentOrigin) {
    throw redirect(supabaseClientFlowUrl!)
  }

  try {
    const next =
      supabaseType === 'recovery'
        ? `${request.nextUrl.origin}${PROTECTED_URLS.RESET_PASSWORD}`
        : supabaseRedirectTo

    const redirectUrl = new URL(next)

    const response = NextResponse.redirect(redirectUrl)
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type: supabaseType,
      token_hash: supabaseTokenHash,
    })

    if (error) {
      logError('AUTH_CONFIRM_ERROR', {
        supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
        supabaseType,
        supabaseRedirectTo,
        redirectUrl: redirectUrl.toString(),
        errorCode: error.code,
        errorStatus: error.status,
        errorMessage: error.message,
      })

      let errorMessage = 'Invalid Token'
      if (error.status === 403 && error.code === 'otp_expired') {
        errorMessage = 'Email link has expired. Please request a new one.'
      }

      return encodedRedirect(
        'error',
        dashboardSignInUrl.toString(),
        errorMessage
      )
    }

    logInfo('AUTH_CONFIRM_SUCCESS', {
      supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
      supabaseType,
      supabaseRedirectTo,
      redirectUrl: redirectUrl.toString(),
    })

    return response
  } catch (e) {
    logError('AUTH_CONFIRM_ERROR', {
      error: e,
    })
    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Token'
    )
  }
}
