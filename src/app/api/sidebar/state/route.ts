import { cookies } from 'next/headers'
import { z } from 'zod'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'

const SidebarStateSchema = z.object({
  state: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const body = SidebarStateSchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SIDEBAR_STATE,
      body.state.toString(),
      COOKIE_OPTIONS[COOKIE_KEYS.SIDEBAR_STATE]
    )

    return Response.json({ state: body.state })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
