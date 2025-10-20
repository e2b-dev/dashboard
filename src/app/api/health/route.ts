import { kv } from '@/lib/clients/kv'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await kv.ping()

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'KV check failed',
      },
      { status: 503 }
    )
  }
}
