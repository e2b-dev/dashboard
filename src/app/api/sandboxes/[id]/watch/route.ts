import { NextRequest } from 'next/server'
import { WatchDirPool } from '@/lib/clients/watch-dir-pool'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { createRouteClient } from '@/lib/clients/supabase/server'
import { VERBOSE } from '@/configs/flags'
import { logDebug } from '@/lib/clients/logger'

export const maxDuration = 600 // 10 minutes

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

  if (VERBOSE) logDebug('WatchRoute.init', { id, dir, teamId })

  const supabase = createRouteClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sandboxOpts = {
    headers: {
      ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
    },
  }

  if (VERBOSE) logDebug('WatchRoute.sandboxOpts')

  let watcherReleased = false
  let ping: ReturnType<typeof setInterval> | undefined
  let onEvent: (ev: unknown) => void
  let cleanup: () => void

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()

      onEvent = (ev: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      if (VERBOSE) logDebug('WatchRoute.acquireWatcher')

      await WatchDirPool.acquire(id, dir, onEvent, sandboxOpts)

      if (VERBOSE) logDebug('WatchRoute.watcherReady')

      // helper that performs a full teardown exactly once
      cleanup = () => {
        if (!watcherReleased) {
          watcherReleased = true
          if (VERBOSE) logDebug('WatchRoute.cleanup')
          void WatchDirPool.release(id, dir, onEvent)
        }
        if (ping) clearInterval(ping)
        controller.close()
      }

      // periodic comment ping to keep intermediary proxies / clients happy
      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch (err) {
          if (VERBOSE) logDebug('WatchRoute.pingError', err)
          cleanup()
        }
      }, 5_000)

      request.signal.addEventListener('abort', () => {
        if (VERBOSE) logDebug('WatchRoute.abort')
        cleanup()
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
      if (VERBOSE) logDebug('WatchRoute.cancelStream')
      cleanup?.()
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
