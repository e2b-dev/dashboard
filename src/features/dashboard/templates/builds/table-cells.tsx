'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useTemplateTableStore } from '@/features/dashboard/templates/list/stores/table-store'
import { cn } from '@/lib/utils'
import { formatDurationCompact } from '@/lib/utils/formatting'
import type {
  BuildStatusDTO,
  ListedBuildDTO,
} from '@/server/api/models/builds.models'
import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CloseIcon } from '@/ui/primitives/icons'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function BuildId({ id }: { id: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-fg-tertiary truncate">{id}</p>
        </TooltipTrigger>
        <TooltipContent className="p-1 px-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-[10px]!">Build ID</Label>
              <div className="prose-label-highlight text-fg-tertiary">{id}</div>
            </div>
            <CopyButton
              value={id}
              variant="ghost"
              className="self-end size-4 text-fg-secondary"
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      <span className="flex items-center gap-2">
        <Loader variant="slash" size="sm" />
        Loading...
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
      <span className="prose-table-numeric whitespace-nowrap text-fg-tertiary flex items-center gap-1">
        {formatDurationCompact(duration)} <Loader variant="dots" />
      </span>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="prose-table-numeric text-fg-secondary whitespace-nowrap">
            {formatDurationCompact(duration)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="p-1 px-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-[10px]!">Finished at</Label>
              <div className="prose-label-highlight text-fg-tertiary">
                {iso}
              </div>
            </div>
            <CopyButton
              value={iso}
              variant="ghost"
              className="self-end size-4 text-fg-secondary"
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const iso = new Date(timestamp).toISOString()

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="prose-table-numeric text-fg-tertiary whitespace-nowrap">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </TooltipTrigger>
        <TooltipContent className="p-1 px-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-[10px]!">Started at</Label>
              <div className="prose-label-highlight text-fg-tertiary">
                {iso}
              </div>
            </div>
            <CopyButton
              value={iso}
              variant="ghost"
              className="self-end size-4 text-fg-secondary"
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
        className={cn('select-none flex-shrink-0', {
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
    <p className="prose-table text-accent-error-highlight truncate max-w-full">
      {statusMessage}
    </p>
  )
}
