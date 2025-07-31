import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { createClient } from '@/lib/clients/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sandboxId = searchParams.get('sandboxId')
  const teamId = searchParams.get('teamId')

  if (!sandboxId) {
    return NextResponse.json(
      { error: 'Missing sandboxId parameter' },
      { status: 400 }
    )
  }

  if (!teamId) {
    return NextResponse.json(
      { error: 'Missing teamId parameter' },
      { status: 400 }
    )
  }

  try {
    const res = await infra.GET('/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      if (status === 404) {
        return NextResponse.json(
          { error: 'Sandbox not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch sandbox details' },
        { status: status || 500 }
      )
    }

    return NextResponse.json(res.data)
  } catch (error) {
    console.error('Error fetching sandbox details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
