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
        'text-fg-secondary h-auto p-0 gap-1 font-sans prose-body normal-case max-w-full underline underline-offset-2 hover:text-accent-main-highlight',
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

  // no timestamp to copy - just show duration
  if (isBuilding || !finishedAt) {
    return (
      <span className="whitespace-nowrap text-fg-secondary">
        {formatDurationCompact(duration)}
      </span>
    )
  }

  const iso = new Date(finishedAt).toISOString()
  const formattedTimestamp = formatCompactDate(finishedAt)

  return (
    <CopyButtonInline value={iso} className="whitespace-nowrap text-fg-secondary group/time">
      In {formatDurationCompact(duration)}{' '}
      <span className="text-fg-tertiary group-hover/time:text-current transition-colors">
        · {formattedTimestamp}
      </span>
    </CopyButtonInline>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const iso = new Date(timestamp).toISOString()
  const elapsed = Date.now() - timestamp
  const formattedTimestamp = formatCompactDate(timestamp)

  return (
    <CopyButtonInline value={iso} className="whitespace-nowrap text-fg-secondary group/time">
      {formatTimeAgoCompact(elapsed)}{' '}
      <span className="text-fg-tertiary group-hover/time:text-current transition-colors">
        · {formattedTimestamp}
      </span>
    </CopyButtonInline>
  )
}
