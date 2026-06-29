import { NextResponse } from 'next/server'
import { api } from '@/core/shared/clients/api'
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
  const dashboardApi = await checkDashboardApi()

  const checks = { dashboardApi }

  return NextResponse.json(
    {
      status: dashboardApi ? 'ok' : 'degraded',
      checks,
    },
    {
      status: dashboardApi ? 200 : 503,
      headers: {
        // vercel infra respects this to cache on cdn
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    }
  )
}
