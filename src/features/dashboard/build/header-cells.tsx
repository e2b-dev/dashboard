import { PROTECTED_URLS } from '@/configs/urls'
import {
  formatCompactDate,
  formatDurationCompact,
  formatTimeAgoCompact,
} from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Button } from '@/ui/primitives/button'
import { ArrowUpRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTemplateTableStore } from '../templates/list/stores/table-store'

export function Template({
  template,
  templateId,
  className,
}: {
  template: string
  templateId: string
  className?: string
}) {
  const router = useRouter()
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()

  return (
    <Button
      variant="link"
      className={cn(
        'text-fg h-auto p-0 gap-1 font-sans prose-table normal-case max-w-full',
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()

        useTemplateTableStore.getState().setGlobalFilter(templateId)
        router.push(PROTECTED_URLS.TEMPLATES_LIST(teamIdOrSlug))
      }}
    >
      <p className="truncate">{template}</p>
      <ArrowUpRight className="size-3 min-w-3" />
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

  if (isBuilding) {
    return (
      <span className="whitespace-nowrap text-fg-tertiary">
        {formatDurationCompact(duration)}
      </span>
    )
  }

  const iso = finishedAt ? new Date(finishedAt).toISOString() : null
  const formattedTimestamp = finishedAt ? formatCompactDate(finishedAt) : null

  return (
    <CopyButtonInline value={iso ?? ''} className="whitespace-nowrap group/time">
      {formatDurationCompact(duration)}{' '}
      <span className="text-fg-tertiary group-hover/time:text-current transition-colors">· {formattedTimestamp}</span>
    </CopyButtonInline>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const iso = new Date(timestamp).toISOString()
  const elapsed = Date.now() - timestamp
  const formattedTimestamp = formatCompactDate(timestamp)

  return (
    <CopyButtonInline value={iso} className="whitespace-nowrap group/time">
      {formatTimeAgoCompact(elapsed)}{' '}
      <span className="text-fg-tertiary group-hover/time:text-current transition-colors">· {formattedTimestamp}</span>
    </CopyButtonInline>
  )
}
