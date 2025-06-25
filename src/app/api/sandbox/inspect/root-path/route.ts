'use server'

import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'

const BodySchema = z.object({ path: z.string() })

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH, body.path, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return Response.json({ path: body.path })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
