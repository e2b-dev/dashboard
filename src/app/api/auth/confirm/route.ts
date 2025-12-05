import { AUTH_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { encodedRedirect } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
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
  next: z.httpUrl(),
})

const normalizeOrigin = (origin: string) =>
  origin.replace('www.', '').replace(/\/$/, '')

function isExternalOrigin(next: string, dashboardOrigin: string): boolean {
  return (
    normalizeOrigin(new URL(next).origin) !== normalizeOrigin(dashboardOrigin)
  )
}

/**
 * This route acts as an intermediary for email OTP verification.
 *
 * Email providers may prefetch/scan links, consuming OTP tokens before users click.
 * To prevent this:
 * - Same-origin requests: Redirect to /confirm page where user must click to verify
 * - External origin requests: Redirect to Supabase client flow URL (for external apps)
 */
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

  const { token_hash, type, next } = result.data
  const dashboardOrigin = request.nextUrl.origin
  const isDifferentOrigin = isExternalOrigin(next, dashboardOrigin)

  l.info(
    {
      key: 'auth_confirm:init',
      context: {
        tokenHashPrefix: token_hash.slice(0, 10),
        type,
        next,
        isDifferentOrigin,
        origin: dashboardOrigin,
      },
    },
    `confirming email with OTP token hash: ${token_hash.slice(0, 10)}`
  )

  // external origin: redirect to supabase client flow for the external app to handle
  if (isDifferentOrigin) {
    const supabaseClientFlowUrl = new URL(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(next)}`
    )

    l.info(
      {
        key: 'auth_confirm:redirect_to_supabase_client_flow',
        context: {
          supabaseClientFlowUrl: supabaseClientFlowUrl.toString(),
          next,
        },
      },
      `redirecting to supabase client flow: ${supabaseClientFlowUrl.toString()}`
    )

    throw redirect(supabaseClientFlowUrl.toString())
  }

  // same origin: redirect to /confirm page for user to explicitly confirm
  const confirmPageUrl = new URL(dashboardOrigin + AUTH_URLS.CONFIRM)
  confirmPageUrl.searchParams.set('token_hash', token_hash)
  confirmPageUrl.searchParams.set('type', type)
  confirmPageUrl.searchParams.set('next', next)

  l.info(
    {
      key: 'auth_confirm:redirect_to_confirm_page',
      context: {
        tokenHashPrefix: token_hash.slice(0, 10),
        type,
        confirmPageUrl: confirmPageUrl.toString(),
      },
    },
    `redirecting to confirm page: ${confirmPageUrl.toString()}`
  )

  throw redirect(confirmPageUrl.toString())
}
