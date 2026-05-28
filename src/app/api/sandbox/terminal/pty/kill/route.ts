import 'server-cli-only'

import Sandbox from 'e2b'
import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { auth } from '@/core/server/auth'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const BodySchema = z.object({
  pid: z.number().int().positive(),
  sandboxId: z.string().min(1),
  teamId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const parsedBody = BodySchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const authContext = await auth.getAuthContext()

    if (!authContext) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { pid, sandboxId, teamId } = parsedBody.data
    const sandbox = await Sandbox.connect(sandboxId, {
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      headers: {
        ...SUPABASE_AUTH_HEADERS(authContext.accessToken, teamId),
      },
    })

    await sandbox.pty.kill(pid)

    return Response.json({ ok: true })
  } catch (error) {
    l.error(
      {
        key: 'terminal_pty_kill_route:unexpected_error',
        error: serializeErrorForLog(error),
      },
      `${error instanceof Error ? error.message : 'Failed to kill terminal PTY'}`
    )

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
