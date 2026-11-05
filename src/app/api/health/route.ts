import { NextResponse } from 'next/server'
import { infra } from '@/core/shared/clients/api'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export const maxDuration = 10

async function checkInfraApi(): Promise<boolean> {
  try {
    // infra-api answers /health with text/plain, which the default JSON parsing rejects
    const { response, error } = await infra.GET('/health', {
      parseAs: 'text',
    })
    if (response.ok) {
      return true
    }

    l.error(
      {
        key: 'health_check:infra_api_error',
        status: response.status,
        error,
      },
      'Infra API health check failed'
    )
  } catch (error) {
    l.error(
      {
        key: 'health_check:infra_api_error',
        error: serializeErrorForLog(error),
      },
      'Infra API health check failed'
    )
  }

  return false
}

export async function GET() {
  const infraApi = await checkInfraApi()

  const checks = { infraApi }

  return NextResponse.json(
    {
      status: infraApi ? 'ok' : 'degraded',
      checks,
    },
    {
      status: infraApi ? 200 : 503,
      headers: {
        // vercel infra respects this to cache on cdn
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    }
  )
}
