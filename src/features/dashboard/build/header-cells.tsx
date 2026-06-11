import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  formatZonedCompactDate,
  useTimezone,
} from '@/features/dashboard/timezone'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import {
  formatDurationCompact,
  formatTimeAgoCompact,
} from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Button } from '@/ui/primitives/button'

export function Template({
  template,
  templateId,
  className,
}: {
  template: string
  templateId: string
  className?: string
}) {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()

  return (
    <Button
      asChild
      variant="link"
      size="none"
      className={cn('max-w-full', className)}
    >
      <Link
        href={PROTECTED_URLS.TEMPLATE_OVERVIEW(teamSlug, templateId)}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="truncate">{template}</p>
      </Link>
    </Button>
  )
}

export function RanFor({
  startedAt,
  finishedAt,
  isBuilding,
}: {
  startedAt: number
  finishedAt: number | null
  isBuilding: boolean
}) {
  const { timezone } = useTimezone()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isBuilding) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [isBuilding])

  const duration = isBuilding
    ? now - startedAt
    : (finishedAt ?? now) - startedAt

  // no timestamp to copy - just show duration
  if (isBuilding || !finishedAt) {
    return (
      <span className="whitespace-nowrap text-fg-secondary">
        {formatDurationCompact(duration)}
      </span>
    )
  }

  const iso = new Date(finishedAt).toISOString()
  const formattedTimestamp = formatZonedCompactDate(finishedAt, timezone)

  return (
    <CopyButtonInline
      value={iso}
      className="whitespace-nowrap text-fg-secondary group/time"
    >
      In {formatDurationCompact(duration)}{' '}
      <span className="text-fg-tertiary">· {formattedTimestamp}</span>
    </CopyButtonInline>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const { timezone } = useTimezone()
  const iso = new Date(timestamp).toISOString()
  const elapsed = Date.now() - timestamp
  const formattedTimestamp = formatZonedCompactDate(timestamp, timezone)

  return (
    <CopyButtonInline
      value={iso}
      className="whitespace-nowrap text-fg-secondary group/time"
    >
      {formatTimeAgoCompact(elapsed)}{' '}
      <span className="text-fg-tertiary">· {formattedTimestamp}</span>
    </CopyButtonInline>
  )
}
