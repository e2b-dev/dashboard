import 'server-only'

import { LiveDot } from '@/ui/live'
import { cacheLife } from 'next/cache'
import Link from 'next/link'

const STATUS_PAGE_URL = 'https://status.e2b.dev'
const STATUS_PAGE_INDEX_URL = `${STATUS_PAGE_URL}/index.json`
const STATUS_PAGE_FETCH_TIMEOUT_MS = 5_000

type AggregateState =
  | 'operational'
  | 'degraded'
  | 'downtime'
  | 'maintenance'
  | 'unknown'

interface StatusPageIndexResponse {
  data?: {
    attributes?: {
      aggregate_state?: string
    }
  }
}

interface StatusUI {
  label: string
  dotCircleClassName: string
  dotClassName: string
}

function toAggregateState(value: string | undefined): AggregateState {
  if (value === 'operational') return 'operational'
  if (value === 'degraded') return 'degraded'
  if (value === 'downtime') return 'downtime'
  if (value === 'maintenance') return 'maintenance'
  return 'unknown'
}

function getStatusUI(state: AggregateState): StatusUI {
  switch (state) {
    case 'operational':
      return {
        label: 'ALL SYSTEMS OPERATIONAL',
        dotCircleClassName: 'bg-accent-positive-highlight/30',
        dotClassName: 'bg-accent-positive-highlight',
      }
    case 'degraded':
      return {
        label: 'SYSTEMS DEGRADED',
        dotCircleClassName: 'bg-accent-warning-highlight/30',
        dotClassName: 'bg-accent-warning-highlight',
      }
    case 'downtime':
      return {
        label: 'DOWNTIME',
        dotCircleClassName: 'bg-accent-error-highlight/30',
        dotClassName: 'bg-accent-error-highlight',
      }
    case 'maintenance':
      return {
        label: 'MAINTENANCE',
        dotCircleClassName: 'bg-accent-info-highlight/30',
        dotClassName: 'bg-accent-info-highlight',
      }
    default:
      return {
        label: 'UNKNOWN SYSTEM STATUS',
        dotCircleClassName: 'bg-icon-secondary/30',
        dotClassName: 'bg-icon-secondary',
      }
  }
}

async function getStatusPageState(): Promise<AggregateState> {
  'use cache'
  cacheLife({
    stale: 30,
    revalidate: 30,
    expire: 60,
  })

  try {
    const response = await fetch(STATUS_PAGE_INDEX_URL, {
      signal: AbortSignal.timeout(STATUS_PAGE_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      return 'unknown'
    }

    const data = (await response.json()) as StatusPageIndexResponse
    return toAggregateState(data.data?.attributes?.aggregate_state)
  } catch {
    return 'unknown'
  }
}

export default async function DashboardStatusBadgeServer() {
  const status = await getStatusPageState()
  const ui = getStatusUI(status)

  return (
    <Link
      href={STATUS_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-5 shrink-0 items-center gap-1.5"
      aria-label={`System status: ${ui.label}`}
    >
      <LiveDot
        classNames={{
          circle: `size-3.5 p-0.5 ${ui.dotCircleClassName}`,
          dot: `size-1.5 ${ui.dotClassName}`,
        }}
      />
      <span className="whitespace-nowrap text-xs text-fg-tertiary uppercase md:prose-label">
        {ui.label}
      </span>
    </Link>
  )
}
