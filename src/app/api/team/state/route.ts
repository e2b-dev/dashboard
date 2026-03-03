import { cookies } from 'next/headers'
import { z } from 'zod'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'

const TeamStateSchema = z.object({
  teamId: z.string(),
  teamSlug: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = TeamStateSchema.parse(await request.json())

    const cookieStore = await cookies()

    cookieStore.set(
      COOKIE_KEYS.SELECTED_TEAM_ID,
      body.teamId,
      COOKIE_OPTIONS[COOKIE_KEYS.SELECTED_TEAM_ID]
    )
    cookieStore.set(
      COOKIE_KEYS.SELECTED_TEAM_SLUG,
      body.teamSlug,
      COOKIE_OPTIONS[COOKIE_KEYS.SELECTED_TEAM_SLUG]
    )

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
