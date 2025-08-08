'use server'

import { COOKIE_KEYS } from '@/configs/keys'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { cookies } from 'next/headers'
import { z } from 'zod'

const BodySchema = z.object({ path: z.string() })

const COOKIE_SETTINGS: Partial<ResponseCookie> = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH,
      body.path,
      COOKIE_SETTINGS
    )

    return Response.json({ path: body.path })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
