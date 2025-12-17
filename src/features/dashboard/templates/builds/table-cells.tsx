'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useTemplateTableStore } from '@/features/dashboard/templates/list/stores/table-store'
import { cn } from '@/lib/utils'
import {
  formatDurationCompact,
  formatTimeAgoCompact,
} from '@/lib/utils/formatting'
import type {
  BuildStatusDTO,
  ListedBuildDTO,
} from '@/server/api/models/builds.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CloseIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { ArrowUpRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function BuildId({ id }: { id: string }) {
  return (
    <CopyButtonInline
      value={id}
      className="w-full text-left text-fg-tertiary font-mono prose-table-numeric"
    >
      {id.slice(0, 6)}...{id.slice(-6)}
    </CopyButtonInline>
  )
}

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

export function LoadMoreButton({
  isLoading,
  onLoadMore,
}: {
  isLoading: boolean
  onLoadMore: () => void
}) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1">
        Loading
        <Loader variant="dots" />
      </span>
    )
  }
  return (
    <button
      onClick={onLoadMore}
      className="underline text-fg-secondary hover:text-accent-main-highlight transition-colors"
    >
      Load more
    </button>
  )
}

export function BackToTopButton({ onBackToTop }: { onBackToTop: () => void }) {
  return (
    <button
      onClick={onBackToTop}
      className="underline text-fg-secondary hover:text-accent-main-highlight transition-colors"
    >
      Back to top
    </button>
  )
}

export function Duration({
  createdAt,
  finishedAt,
  isBuilding,
}: {
  createdAt: number
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
    ? now - createdAt
    : (finishedAt ?? now) - createdAt
  const iso = finishedAt ? new Date(finishedAt).toISOString() : null

  return (
    <span className="text-fg-tertiary prose-table-numeric whitespace-nowrap">
      {formatDurationCompact(duration)}
    </span>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const iso = new Date(timestamp).toISOString()
  const elapsed = Date.now() - timestamp

  return (
    <span className="text-fg prose-table-numeric whitespace-nowrap">
      {formatTimeAgoCompact(elapsed)}
    </span>
  )
}

interface StatusProps {
  status: BuildStatusDTO
}

export function Status({ status }: StatusProps) {
  const config: Record<
    BuildStatusDTO,
    {
      label: string
      variant: 'default' | 'positive' | 'error'
      icon: React.ReactNode
    }
  > = {
    building: {
      label: 'Building',
      variant: 'default',
      icon: null,
    },
    success: {
      label: 'Success',
      variant: 'positive',
      icon: <CheckIcon className="size-4 scale-125" />,
    },
    failed: {
      label: 'Failed',
      variant: 'error',
      icon: <CloseIcon className="size-4" />,
    },
  }

  const { label, icon, variant } = config[status]

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Badge
        variant={variant}
        className={cn('select-none shrink-0 uppercase', {
          'bg-bg-inverted/10': variant === 'default',
        })}
      >
        {icon}
        {label}
      </Badge>
    </div>
  )
}

export function Reason({
  statusMessage,
}: {
  statusMessage: ListedBuildDTO['statusMessage']
}) {
  if (!statusMessage) return null

  return (
    <CopyButtonInline
      value={statusMessage}
      className="prose-table text-fg-tertiary truncate max-w-0 min-w-full text-left"
    >
      {statusMessage}
    </CopyButtonInline>
  )
}
