import { NextResponse } from 'next/server'
import { serializeError } from 'serialize-error'
import { api } from '@/core/shared/clients/api'
import { kv } from '@/core/shared/clients/kv'
import { l } from '@/core/shared/clients/logger/logger'

export const maxDuration = 10

export async function GET() {
  const checks = {
    kv: false,
    dashboardApi: false,
  }

  try {
    await kv.ping()
    checks.kv = true
  } catch (error) {
    l.error(
      {
        key: 'health_check:kv_error',
        error: serializeError(error),
      },
      'KV health check failed'
    )
  }

  try {
    const { error } = await api.GET('/health', {})
    if (!error) {
      checks.dashboardApi = true
    } else {
      l.error(
        {
          key: 'health_check:dashboard_api_error',
          error,
        },
        'Dashboard API health check failed'
      )
    }
  } catch (error) {
    l.error(
      {
        key: 'health_check:dashboard_api_error',
        error: serializeError(error),
      },
      'Dashboard API health check failed'
    )
  }

  const allHealthy = checks.kv && checks.dashboardApi

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    }
  )
}
