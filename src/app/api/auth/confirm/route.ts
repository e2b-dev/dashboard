import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { serializeError } from 'serialize-error'
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
  next: z.string().url(),
})

const normalizeOrigin = (origin: string) =>
  origin.replace('www.', '').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const result = confirmSchema.safeParse({
    token_hash: searchParams.get('token_hash'),
    type: searchParams.get('type'),
    next: searchParams.get('next'),
  })

  const dashboardSignInUrl = new URL(request.nextUrl.origin + AUTH_URLS.SIGN_IN)

  if (!result.success) {
    l.error({
      key: 'auth_confirm:invalid_params',
      error: result.error.flatten(),
      context: {
        type: searchParams.get('type'),
        next: searchParams.get('next'),
      },
    })

    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Request'
    )
  }

  const supabaseTokenHash = result.data.token_hash
  const supabaseType = result.data.type
  const supabaseRedirectTo = result.data.next
  const supabaseClientFlowUrl = new URL(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${supabaseTokenHash}&type=${supabaseType}&redirect_to=${supabaseRedirectTo}`
  )

  const dashboardUrl = request.nextUrl

  const isDifferentOrigin =
    supabaseRedirectTo &&
    normalizeOrigin(new URL(supabaseRedirectTo).origin) !==
      normalizeOrigin(dashboardUrl.origin)

  l.info({
    key: 'auth_confirm:init',
    context: {
      supabase_token_hash: supabaseTokenHash
        ? `${supabaseTokenHash.slice(0, 10)}...`
        : null,
      supabaseType,
      supabaseRedirectTo,
      isDifferentOrigin,
      supabaseClientFlowUrl,
      requestUrl: request.url,
      origin: request.nextUrl.origin,
    },
  })

  // when the next param is an absolute URL, with a different origin,
  // we need to redirect to the supabase client flow url
  if (isDifferentOrigin) {
    throw redirect(supabaseClientFlowUrl.toString())
  }

  try {
    const next =
      supabaseType === 'recovery'
        ? `${request.nextUrl.origin}${PROTECTED_URLS.RESET_PASSWORD}`
        : supabaseRedirectTo

    const redirectUrl = new URL(next)

    const supabase = await createClient()

    const { error, data } = await supabase.auth.verifyOtp({
      type: supabaseType,
      token_hash: supabaseTokenHash,
    })

    if (error) {
      l.error({
        key: 'auth_confirm:supabase_error',
        message: error.message,
        error: serializeError(error),
        context: {
          supabase_token_hash: supabaseTokenHash
            ? `${supabaseTokenHash.slice(0, 10)}...`
            : null,
          supabaseType,
          supabaseRedirectTo,
          redirectUrl: redirectUrl.toString(),
        },
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

    // handle re-auth
    if (redirectUrl.pathname === PROTECTED_URLS.ACCOUNT_SETTINGS) {
      redirectUrl.searchParams.set('reauth', '1')

      return NextResponse.redirect(redirectUrl.toString())
    }

    l.info({
      key: 'auth_confirm:success',
      user_id: data?.user?.id,
      context: {
        supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
        supabaseType,
        supabaseRedirectTo,
        redirectUrl: redirectUrl.toString(),
        reauth: redirectUrl.searchParams.get('reauth'),
      },
    })

    return NextResponse.redirect(redirectUrl.toString())
  } catch (e) {
    const sE = serializeError(e) as object

    // nextjs internally throws redirects (encodedRedirect with error message in this case)
    // and captures them to do the actual redirect.

    // we need to throw the error to let nextjs handle it
    if (
      'message' in sE &&
      typeof sE.message === 'string' &&
      sE.message.includes('NEXT_REDIRECT')
    ) {
      throw e
    }

    l.error({
      key: 'AUTH_CONFIRM:ERROR',
      message: 'message' in sE ? sE.message : undefined,
      error: sE,
      context: {
        supabaseTokenHash: `${supabaseTokenHash.slice(0, 10)}...`,
        supabaseType,
        supabaseRedirectTo,
      },
    })

    return encodedRedirect(
      'error',
      dashboardSignInUrl.toString(),
      'Invalid Token'
    )
  }
}
