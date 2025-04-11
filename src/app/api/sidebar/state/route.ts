import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { z } from 'zod'

export const SidebarStateSchema = z.object({
  state: z.boolean(),
})

export type SidebarStateRequest = z.infer<typeof SidebarStateSchema>

export async function POST(request: Request, response: Response) {
  try {
    const body = SidebarStateSchema.parse(await request.json())

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_KEYS.SIDEBAR_STATE, body.state.toString())

    return Response.json({ state: body.state })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
