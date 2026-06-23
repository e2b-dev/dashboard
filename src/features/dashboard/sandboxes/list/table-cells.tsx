'use client'

import type { CellContext } from '@tanstack/react-table'
import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { DotIcon, ExternalLinkIcon, PausedIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import type { SandboxListRow } from './table-config'

const MONO_NUMERIC_TEXT_CLASSNAME =
  'overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'

export const CpuUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <ResourceUsage type="cpu" mode="simple" total={row.original.cpuCount} />
  </div>
)

export const RamUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <ResourceUsage type="mem" mode="simple" total={row.original.memoryMB} />
  </div>
)

export const DiskUsageCell = ({
  row,
}: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <ResourceUsage
      type="disk"
      mode="simple"
      total={row.original.diskSizeMB / 1024}
    />
  </div>
)

export function StateCell({ row }: CellContext<SandboxListRow, unknown>) {
  const state = row.original.state

  if (state === 'paused') {
    return (
      <Badge variant="warning" className="uppercase">
        <PausedIcon className="size-2 fill-current" />
        Paused
      </Badge>
    )
  }

  return (
    <Badge variant="positive" className="uppercase">
      <DotIcon className="size-3 animate-pulse fill-current" />
      Running
    </Badge>
  )
}

export function IdCell({ getValue }: CellContext<SandboxListRow, unknown>) {
  return (
    <div
      className={`${MONO_NUMERIC_TEXT_CLASSNAME} text-fg-tertiary select-all`}
    >
      {getValue() as string}
    </div>
  )
}

export function TemplateCell({
  row,
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const templateIdentifier = (getValue() as string | undefined) ?? '--'
  const { team } = useDashboard()
  const templateId = row.original.templateID

  if (!templateId) {
    return (
      <span className="min-w-0 truncate text-fg-tertiary">
        {templateIdentifier}
      </span>
    )
  }

  return (
    <Button asChild variant="link-table" size="none">
      <Link
        href={PROTECTED_URLS.TEMPLATE_OVERVIEW(team.slug, templateId)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate">{templateIdentifier}</span>
        <ExternalLinkIcon className="size-3 shrink-0" />
      </Link>
    </Button>
  )
}

export function MetadataCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const value = (getValue() as string | undefined) ?? '{}'

  const parsedValue = useMemo(() => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }, [value])

  if (!parsedValue || value.trim() === '{}') {
    return <span className="text-fg-tertiary block w-full truncate">n/a</span>
  }

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline min-w-0 normal-case"
      json={parsedValue}
    >
      <span className="block w-full truncate">{value}</span>
    </JsonPopover>
  )
}

export function StartedAtCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const dateValue = (getValue() as string | undefined) ?? ''

  const formattedTimestamp = useMemo(() => {
    return formatLocalLogStyleTimestamp(dateValue, { includeTimezone: true })
  }, [dateValue])

  return (
    <div className={`h-full ${MONO_NUMERIC_TEXT_CLASSNAME}`}>
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}{' '}
      <span className="text-fg-tertiary">
        {formattedTimestamp?.timezonePart ?? ''}
      </span>
    </div>
  )
}
