import { NextRequest } from 'next/server'
import { SandboxPool } from '@/lib/clients/sandbox-pool'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { createRouteClient } from '@/lib/clients/supabase/server'
import { FileType } from 'e2b'
import { FsEntry, FsFileType } from '@/types/filesystem'

export const maxDuration = 60 // quick, single call

/**
 * GET /api/sandboxes/{id}/list?dir=/path&team=
 * Returns JSON array of EntryInfo for the directory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const dir = searchParams.get('dir') ?? '/'
  const teamId = searchParams.get('team') ?? ''

  const supabase = createRouteClient(request)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token)
    return new Response('Unauthorized', { status: 401 })

  const opts = {
    domain: 'xgimi.dev',
    headers: {
      ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
    },
  }

  let entries: FsEntry[] = []
  let error: unknown
  try {
    const sandbox = await SandboxPool.acquire(id, opts)
    const raw = await sandbox.files.list(dir)
    entries = raw.map((e) => ({
      name: e.name,
      path: e.path,
      type:
        e.type === FileType.DIR
          ? ('dir' as FsFileType)
          : ('file' as FsFileType),
    }))
  } catch (err) {
    error = err
  } finally {
    await SandboxPool.release(id)
  }

  if (error) {
    console.error('Dir list error', error)
    return new Response('Failed to list directory', { status: 500 })
  }

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
