'use server'

import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'

const BodySchema = z.object({ interval: z.number() })

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL,
      body.interval.toString(),
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      }
    )

    return Response.json({ interval: body.interval })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
