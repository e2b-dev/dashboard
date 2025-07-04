import { createClient, createRouteClient } from '@/lib/clients/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next

  console.log('Auth confirm route:', {
    token_hash,
    type,
    next,
    redirectTo: redirectTo.toString(),
  })

  if (token_hash && type) {
    const supabase = createRouteClient(request)

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    console.log('OTP verification result:', { error })

    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = '/auth/auth-code-error'
  return NextResponse.redirect(redirectTo)
}
