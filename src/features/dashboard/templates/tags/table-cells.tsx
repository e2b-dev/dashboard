'use client'

import { formatDistanceToNowStrict } from 'date-fns'
import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils/ui'
import { Badge } from '@/ui/primitives/badge'

interface TagPillCellProps {
  tag: string
}

export function TagPillCell({ tag }: TagPillCellProps) {
  return (
    <Badge variant="default" size="sm" className="uppercase bg-fill">
      {tag}
    </Badge>
  )
}

interface BuildLinkCellProps {
  teamSlug: string
  templateId: string
  buildId: string
  createdAt: string
}

const NULL_BUILD_ID = '00000000-0000-0000-0000-000000000000'

export function BuildLinkCell({
  teamSlug,
  templateId,
  buildId,
  createdAt,
}: BuildLinkCellProps) {
  const shortId = useMemo(() => {
    if (buildId === NULL_BUILD_ID) return '--'
    if (buildId.length <= 12) return buildId
    return `${buildId.slice(0, 5)}...${buildId.slice(-5)}`
  }, [buildId])

  const relative = useMemo(() => {
    try {
      return `${formatDistanceToNowStrict(new Date(createdAt))} ago`
    } catch {
      return ''
    }
  }, [createdAt])

  const isLinkable = buildId !== NULL_BUILD_ID

  const inner = (
    <span
      className={cn(
        'font-mono prose-body-numeric',
        isLinkable &&
          'underline underline-offset-2 decoration-fg-tertiary group-hover/build:decoration-fg'
      )}
    >
      {shortId}
    </span>
  )

  return (
    <div className="flex items-center gap-2 min-w-0">
      {isLinkable ? (
        <Link
          href={PROTECTED_URLS.TEMPLATE_BUILD(teamSlug, templateId, buildId)}
          className="group/build text-fg hover:text-fg transition-colors"
        >
          {inner}
        </Link>
      ) : (
        <span className="text-fg-tertiary">{inner}</span>
      )}
      {relative && (
        <span className="text-fg-tertiary prose-body whitespace-nowrap">
          · {relative}
        </span>
      )}
    </div>
  )
}
