'use client'

import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import type {
  BuildStatus,
  ListedBuildModel,
} from '@/core/modules/builds/models'
import { useNow } from '@/lib/hooks/use-now'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import {
  formatDurationCompact,
  formatTimeAgoCompact,
} from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckmarkIcon, CloseIcon } from '@/ui/primitives/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { EnvdVersion } from '../../common/envd-version'
import { ResourceSpec } from '../../common/resource-usage'

export function BuildId({ id }: { id: string }) {
  return (
    <CopyButtonInline
      value={id}
      truncate={false}
      className="w-full text-left text-fg-tertiary font-mono prose-table-numeric"
    >
      {id.slice(0, 7)}...{id.slice(-5)}
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
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()

  return (
    <Button
      asChild
      variant="link-table"
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

export function Duration({
  createdAt,
  finishedAt,
  isBuilding,
}: {
  createdAt: number
  finishedAt: number | null
  isBuilding: boolean
}) {
  const now = useNow(1000, isBuilding)

  const duration = isBuilding
    ? now - createdAt
    : (finishedAt ?? now) - createdAt

  return (
    <span className="text-fg-tertiary prose-table-numeric whitespace-nowrap">
      {formatDurationCompact(duration)}
    </span>
  )
}

export function StartedAt({ timestamp }: { timestamp: number }) {
  const elapsed = Date.now() - timestamp

  return (
    <span className="text-fg prose-table-numeric whitespace-nowrap">
      {formatTimeAgoCompact(elapsed)}
    </span>
  )
}

interface StatusProps {
  status: BuildStatus
  statusMessage?: ListedBuildModel['statusMessage']
}

export function Status({ status, statusMessage }: StatusProps) {
  const config: Record<
    BuildStatus,
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
      icon: <CheckmarkIcon className="size-4 scale-125" />,
    },
    failed: {
      label: 'Failed',
      variant: 'error',
      icon: <CloseIcon className="size-4" />,
    },
  }

  const { label, icon, variant } = config[status]!

  const badge = (
    <Badge
      variant={variant}
      className={cn('select-none shrink-0 uppercase cursor-pointer', {
        'bg-bg-inverted/10': variant === 'default',
      })}
    >
      {icon}
      {label}
    </Badge>
  )

  const showReason = status === 'failed' && Boolean(statusMessage)

  return (
    <div className="flex items-center gap-3 min-w-0 shrink-0">
      {showReason ? (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent
            align="start"
            side="top"
            sideOffset={8}
            className="max-w-[360px] whitespace-pre-wrap break-words text-left font-mono text-xs normal-case text-fg-secondary"
          >
            {statusMessage}
          </TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
    </div>
  )
}

export function Cpu({ cpuCount }: { cpuCount: number }) {
  return (
    <div className="w-full flex justify-end">
      <ResourceSpec value={cpuCount} unit="Core" />
    </div>
  )
}

export function Memory({ memoryMB }: { memoryMB: number }) {
  return (
    <div className="w-full flex justify-end">
      <ResourceSpec value={memoryMB} unit="MB" />
    </div>
  )
}

export function Storage({ diskSizeMB }: { diskSizeMB: number | null }) {
  const diskSizeGB = diskSizeMB != null ? diskSizeMB / 1024 : null
  return (
    <div className="w-full flex justify-end">
      <ResourceSpec value={diskSizeGB} unit="GB" />
    </div>
  )
}

export function Envd({ version }: { version: string | null }) {
  return (
    <div className="w-full flex justify-end">
      <EnvdVersion version={version} />
    </div>
  )
}
