'use client'

import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { formatRelativeAgo } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import { NULL_BUILD_ID } from './constants'

interface BuildLinkProps {
  templateId: string
  buildId: string
  assignedAt: string
}

export function BuildLink({ templateId, buildId, assignedAt }: BuildLinkProps) {
  const shortId = useMemo(() => {
    if (buildId === NULL_BUILD_ID) return '--'
    if (buildId.length <= 12) return buildId
    return `${buildId.slice(0, 5)}...${buildId.slice(-5)}`
  }, [buildId])

  const relative = useMemo(() => {
    const d = new Date(assignedAt)
    return Number.isNaN(d.getTime()) ? '' : formatRelativeAgo(d)
  }, [assignedAt])

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
        <HoverPrefetchLink
          href={PROTECTED_URLS.TEMPLATE_BUILD(templateId, buildId)}
          className="group/build text-fg hover:text-fg"
        >
          {inner}
        </HoverPrefetchLink>
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
