import { kv } from '@/lib/clients/kv'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { NextResponse } from 'next/server'

// NOTE - using cdn caching for rate limiting on db calls

export const maxDuration = 10

export async function GET() {
  const checks = {
    kv: false,
    supabase: false,
  }

  // check kv
  try {
    await kv.ping()
    checks.kv = true
  } catch (error) {
    // kv failed
  }

  // check supabase
  const { data: _, error } = await supabaseAdmin
    .from('teams')
    .select('id')
    .limit(1)
    .single()

  if (!error) {
    checks.supabase = true
  }

  const allHealthy = checks.kv && checks.supabase

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        // vercel infra respects this to cache on cdn
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    }
  )
}
