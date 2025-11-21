import { cn } from '@/lib/utils'
import { formatDurationCompact } from '@/lib/utils/formatting'
import type {
  BuildStatusDTO,
  ListedBuildDTO,
} from '@/server/api/models/builds.models'
import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
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
import { useEffect, useState } from 'react'

export function BuildId({ shortId }: { shortId: string }) {
  return <span className="whitespace-nowrap text-fg-tertiary">{shortId}</span>
}

export function Template({ name }: { name: string }) {
  return <p className="truncate">{name}</p>
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

  if (!iso) {
    return (
      <span className="prose-table-numeric whitespace-nowrap">
        {formatDurationCompact(duration)}
      </span>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {isBuilding && (
              <Loader className="text-[8px] transform-y-0.5 text-fg-tertiary" />
            )}
            <span className="prose-table-numeric text-fg-secondary whitespace-nowrap">
              {formatDurationCompact(duration)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Finished at</Label>
              <div className="font-mono prose-label text-fg-secondary">
                {iso}
              </div>
            </div>
            <CopyButton
              value={iso}
              variant="ghost"
              className="self-end size-4.5"
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
        <TooltipContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Started at</Label>
              <div className="font-mono prose-label text-fg-secondary">
                {iso}
              </div>
            </div>
            <CopyButton
              value={iso}
              variant="ghost"
              className="self-end size-4.5"
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
    <p className="prose-table text-accent-error-highlight/80 truncate max-w-full">
      {statusMessage}
    </p>
  )
}
