import { NextRequest } from 'next/server'
import { WatchDirPool } from '@/lib/clients/watch-dir-pool'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { createRouteClient } from '@/lib/clients/supabase/server'

export const maxDuration = 900 // 15 minutes

/**
 * SSE endpoint that streams filesystem events for a sandbox directory.
 *
 * Request:  GET /api/sandboxes/{id}/watch?dir=/path
 *
 * The caller must be authenticated (via Supabase session cookie) so that we
 * can forward the JWT to the E2B backend.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  }
) {
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const dir = searchParams.get('dir') ?? '/'
  const teamId = searchParams.get('team') ?? ''

  const supabase = createRouteClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sandboxOpts = {
    domain: 'xgimi.dev',
    headers: {
      ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
    },
  }

  let watcherReleased = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()

      const onEvent = (ev: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      await WatchDirPool.acquire(id, dir, onEvent, sandboxOpts)

      request.signal.addEventListener('abort', () => {
        if (!watcherReleased) {
          watcherReleased = true
          void WatchDirPool.release(id, dir, onEvent)
        }
        controller.close()
      })
    },
    /**
     * This runs if the ReadableStream is cancelled *without* the `abort` event
     * (for example `response.body.cancel()` or an abrupt GC).  At this point we
     * no longer have a reference to the original `onEvent` callback, so we
     * cannot call `WatchDirPool.release(...)` accurately.  Instead we just mark
     * the watcher as released; the pool's idle-timer will close the underlying
     * gRPC stream after `GRACE_MS` once it sees the ref-count hasn't changed.
     */
    cancel() {
      if (!watcherReleased) {
        watcherReleased = true
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
