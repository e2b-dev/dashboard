import { COOKIE_KEYS } from '@/configs/keys'
import { setEncryptedCookie } from '@/lib/utils/cookies'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = COOKIE_KEYS.API_DOMAIN
const COOKIE_OPTIONS = {
  expires: 8640000000, // ~100 years in seconds
  maxAge: 8640000000, // ~100 years in seconds
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
} as const

export async function POST(req: NextRequest) {
  const { domain } = await req.json()

  const response = new NextResponse(null, { status: 200 })

  response.cookies.set(
    ...(await setEncryptedCookie(COOKIE_NAME, domain, COOKIE_OPTIONS))
  )

  revalidatePath('/dashboard', 'layout')

  return response
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 200 })

  response.cookies.delete(COOKIE_NAME)

  revalidatePath('/dashboard', 'layout')

  return response
}
