'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useTemplateTableStore } from '@/features/dashboard/templates/list/stores/table-store'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { cn } from '@/lib/utils'
import {
  formatDurationCompact,
  formatTimeAgoCompact,
} from '@/lib/utils/formatting'
import type {
  BuildStatusDTO,
  ListedBuildDTO,
} from '@/server/api/models/builds.models'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CloseIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { ArrowUpRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function CopyableCell({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const [wasCopied, copy] = useClipboard()

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        copy(value)
      }}
      className={cn(
        'text-fg-tertiary transition-colors cursor-copy',
        'hover:text-fg-secondary',
        wasCopied && 'text-accent-main',
        className
      )}
    >
      {wasCopied ? 'Copied!' : children}
    </button>
  )
}

export function BuildId({ id }: { id: string }) {
  return (
    <CopyableCell value={id} className="truncate text-left w-full">
      {id}
    </CopyableCell>
  )
}

export function Template({
  name,
  templateId,
}: {
  name: string
  templateId: string
}) {
  const router = useRouter()
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()

  return (
    <Button
      variant="link"
      className="text-fg h-auto p-0 gap-1 font-sans prose-table normal-case max-w-full"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()

        useTemplateTableStore.getState().setGlobalFilter(templateId)
        router.push(PROTECTED_URLS.TEMPLATES_LIST(teamIdOrSlug))
      }}
    >
      <p className="truncate">{name}</p>
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

  if (isBuilding || !iso) {
    return (
      <span className="prose-table-numeric whitespace-nowrap text-fg-tertiary">
        {formatDurationCompact(duration)}
      </span>
    )
  }

  return (
    <CopyableCell value={iso} className="prose-table-numeric whitespace-nowrap">
      {formatDurationCompact(duration)}
    </CopyableCell>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const iso = new Date(timestamp).toISOString()
  const elapsed = Date.now() - timestamp

  return (
    <CopyableCell value={iso} className="prose-table-numeric whitespace-nowrap">
      {formatTimeAgoCompact(elapsed)}
    </CopyableCell>
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
        className={cn('select-none flex-shrink-0 uppercase', {
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
    <CopyableCell
      value={statusMessage}
      className="truncate max-w-0 min-w-full text-left"
    >
      {statusMessage}
    </CopyableCell>
  )
}
