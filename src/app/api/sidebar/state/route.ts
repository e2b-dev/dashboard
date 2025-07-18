import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const SidebarStateSchema = z.object({
  state: z.boolean(),
})

const COOKIE_SETTINGS: Partial<ResponseCookie> = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

export async function POST(request: Request) {
  try {
    const body = SidebarStateSchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(
      COOKIE_KEYS.SIDEBAR_STATE,
      body.state.toString(),
      COOKIE_SETTINGS
    )

    return Response.json({ state: body.state })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
