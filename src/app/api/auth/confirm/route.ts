import { AUTH_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { encodedRedirect, isExternalOrigin } from '@/lib/utils/auth'
import { ConfirmEmailInputSchema } from '@/server/api/models/auth.models'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

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

  const result = ConfirmEmailInputSchema.safeParse({
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
        token_hash_prefix: token_hash.slice(0, 10),
        type,
        next,
        is_different_origin: isDifferentOrigin,
        origin: dashboardOrigin,
      },
    },
    `confirming email with OTP token hash: ${token_hash.slice(0, 10)}`
  )

  if (isDifferentOrigin) {
    const supabaseClientFlowUrl = new URL(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(next)}`
    )

    l.info(
      {
        key: 'auth_confirm:redirect_to_supabase_client_flow',
        context: {
          supabase_client_flow_url: supabaseClientFlowUrl.toString(),
          next,
        },
      },
      `redirecting to supabase client flow: ${supabaseClientFlowUrl.toString()}`
    )

    throw redirect(supabaseClientFlowUrl.toString())
  }

  const confirmPageUrl = new URL(dashboardOrigin + AUTH_URLS.CONFIRM)
  confirmPageUrl.searchParams.set('token_hash', token_hash)
  confirmPageUrl.searchParams.set('type', type)
  confirmPageUrl.searchParams.set('next', next)

  l.info(
    {
      key: 'auth_confirm:redirect_to_confirm_page',
      context: {
        token_hash_prefix: token_hash.slice(0, 10),
        type,
        confirm_page_url: confirmPageUrl.toString(),
      },
    },
    `redirecting to confirm page: ${confirmPageUrl.toString()}`
  )

  throw redirect(confirmPageUrl.toString())
}
