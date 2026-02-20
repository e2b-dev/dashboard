import 'server-only'

import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { Badge } from '@/ui/primitives/badge'

const STATUS_PAGE_URL = 'https://status.e2b.dev'
const STATUS_PAGE_INDEX_URL = `${STATUS_PAGE_URL}/index.json`

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
  variant: 'positive' | 'warning' | 'error' | 'info'
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
        label: 'Operational',
        variant: 'positive',
        dotClassName: 'bg-accent-positive-highlight',
      }
    case 'degraded':
      return {
        label: 'Degraded',
        variant: 'warning',
        dotClassName: 'bg-accent-warning-highlight',
      }
    case 'downtime':
      return {
        label: 'Downtime',
        variant: 'error',
        dotClassName: 'bg-accent-error-highlight',
      }
    case 'maintenance':
      return {
        label: 'Maintenance',
        variant: 'info',
        dotClassName: 'bg-accent-info-highlight',
      }
    default:
      return {
        label: 'Status Unknown',
        variant: 'info',
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
    const response = await fetch(STATUS_PAGE_INDEX_URL)

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
    <Link href={STATUS_PAGE_URL} target="_blank" rel="noopener noreferrer">
      <Badge
        size="sm"
        variant={ui.variant}
        typography="highlight"
        className="uppercase"
      >
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${ui.dotClassName}`}
        />
        {ui.label}
      </Badge>
    </Link>
  )
}
