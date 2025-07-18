import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const TeamStateSchema = z.object({
  teamId: z.string(),
  teamSlug: z.string(),
})

const COOKIE_SETTINGS: Partial<ResponseCookie> = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

export async function POST(request: Request) {
  try {
    const body = TeamStateSchema.parse(await request.json())

    const cookieStore = await cookies()

    cookieStore.set(COOKIE_KEYS.SELECTED_TEAM_ID, body.teamId, COOKIE_SETTINGS)
    cookieStore.set(
      COOKIE_KEYS.SELECTED_TEAM_SLUG,
      body.teamSlug,
      COOKIE_SETTINGS
    )

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
