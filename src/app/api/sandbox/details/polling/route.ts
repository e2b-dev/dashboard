'use server'

import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'
import { cookies } from 'next/headers'
import { z } from 'zod'

const BodySchema = z.object({ interval: z.number() })

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL,
      body.interval.toString(),
      COOKIE_OPTIONS[COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL]
    )

    return Response.json({ interval: body.interval })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
