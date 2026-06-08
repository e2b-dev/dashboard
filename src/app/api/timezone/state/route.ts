import { cookies } from 'next/headers'
import { z } from 'zod'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'
import { TimezoneSchema } from '@/features/dashboard/timezone/schema'

const TimezoneStateSchema = z.object({
  timezone: TimezoneSchema,
})

export const POST = async (request: Request) => {
  try {
    const result = TimezoneStateSchema.safeParse(await request.json())
    if (!result.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.DASHBOARD_TIMEZONE,
      result.data.timezone,
      COOKIE_OPTIONS[COOKIE_KEYS.DASHBOARD_TIMEZONE]
    )

    return Response.json({ timezone: result.data.timezone })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
