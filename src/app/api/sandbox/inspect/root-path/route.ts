'use server'

import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'
import { cookies } from 'next/headers'
import { z } from 'zod'

const BodySchema = z.object({ path: z.string() })

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH,
      body.path,
      COOKIE_OPTIONS[COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH]
    )

    return Response.json({ path: body.path })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
