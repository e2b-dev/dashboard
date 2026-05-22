import { NextResponse } from 'next/server'
import { api } from '@/core/shared/clients/api'
import { pingKv } from '@/core/shared/clients/kv'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export const maxDuration = 10

async function checkDashboardApi(): Promise<boolean> {
  try {
    const { error } = await api.GET('/health', {})
    if (!error) {
      return true
    }

    l.error(
      {
        key: 'health_check:dashboard_api_error',
        error,
      },
      'Dashboard API health check failed'
    )
  } catch (error) {
    l.error(
      {
        key: 'health_check:dashboard_api_error',
        error: serializeErrorForLog(error),
      },
      'Dashboard API health check failed'
    )
  }

  return false
}

export async function GET() {
  const [kvStatus, dashboardApi] = await Promise.all([
    pingKv(),
    checkDashboardApi(),
  ])

  const checks: { kv?: boolean; dashboardApi: boolean } = { dashboardApi }

  if (kvStatus.configured) {
    checks.kv = kvStatus.available
  }

  if (kvStatus.status === 'misconfigured') {
    // Surface misconfiguration in the response body so it's visible
    // without scraping logs.
    checks.kv = false
    l.error(
      {
        key: 'health_check:kv_misconfigured',
      },
      'KV health check is misconfigured'
    )
  }

  if (kvStatus.status === 'error') {
    l.error(
      {
        key: 'health_check:kv_error',
        error: serializeErrorForLog(kvStatus.error),
      },
      'KV health check failed'
    )
  }

  // KV is required *only when configured*. If an operator has wired it up,
  // they expect it to work — so failure or misconfiguration must degrade
  // the overall status. When KV is intentionally absent (not_configured),
  // it contributes nothing to the health check.
  const kvRequiredAndHealthy =
    kvStatus.status === 'not_configured' || kvStatus.status === 'ok'

  const allRequiredHealthy = dashboardApi && kvRequiredAndHealthy

  return NextResponse.json(
    {
      status: allRequiredHealthy ? 'ok' : 'degraded',
      checks,
    },
    {
      status: allRequiredHealthy ? 200 : 503,
      headers: {
        // vercel infra respects this to cache on cdn
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    }
  )
}
