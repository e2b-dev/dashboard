import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'

const SidebarStateSchema = z.object({
  state: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const body = SidebarStateSchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_KEYS.SIDEBAR_STATE, body.state.toString(), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return Response.json({ state: body.state })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
