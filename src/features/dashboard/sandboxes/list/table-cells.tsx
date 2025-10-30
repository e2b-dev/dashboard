'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import { useServerContext } from '@/features/dashboard/server-context'
import { useTemplateTableStore } from '@/features/dashboard/templates/stores/table-store'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { parseUTCDateComponents } from '@/lib/utils/formatting'
import { killSandboxAction } from '@/server/sandboxes/sandbox-actions'
import { Template } from '@/types/api'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Loader } from '@/ui/primitives/loader'
import { CellContext } from '@tanstack/react-table'
import { ArrowUpRight, MoreVertical, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import React, { useMemo } from 'react'
import { useSandboxMetricsStore } from './stores/metrics-store'
import { SandboxWithMetrics } from './table-config'

declare module '@tanstack/react-table' {
  interface TableState {
    templates?: Template[]
  }
}

export function ActionsCell({ row }: CellContext<SandboxWithMetrics, unknown>) {
  const sandbox = row.original
  const selectedTeam = useSelectedTeam()
  const router = useRouter()
  const { toast } = useToast()

  const { execute: executeKillSandbox, isExecuting: isKilling } = useAction(
    killSandboxAction,
    {
      onSuccess: () => {
        toast(
          defaultSuccessToast(`Sandbox ${sandbox.sandboxID} has been killed.`)
        )
        router.refresh()
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(
            error.serverError || 'Failed to kill sandbox. Please try again.'
          )
        )
      },
    }
  )

  const handleKill = () => {
    if (!selectedTeam?.id) return

    executeKillSandbox({
      teamId: selectedTeam.id,
      sandboxId: sandbox.sandboxID,
    })
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        <Button variant="ghost" size="icon" className="text-fg-tertiary size-5">
          {isKilling ? (
            <Loader className="size-4" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger variant="error">
              <Trash2 className="!size-3" />
              Kill
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <div className="space-y-3 p-3 max-w-xs">
                  <div className="space-y-1">
                    <h4>Confirm Kill</h4>
                    <p className="prose-body text-fg-tertiary">
                      Are you sure you want to kill this sandbox? This action
                      cannot be undone.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="error"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleKill()
                      }}
                      disabled={isKilling}
                      loading={isKilling}
                    >
                      Kill Sandbox
                    </Button>
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type CpuUsageProps = { sandboxId: string; totalCpu?: number }
export const CpuUsageCellView = React.memo(function CpuUsageCellView({
  sandboxId,
  totalCpu,
}: CpuUsageProps) {
  const cpuUsedPct = useSandboxMetricsStore(
    (s) => s.metrics?.[sandboxId]?.cpuUsedPct
  )
  return <ResourceUsage type="cpu" metrics={cpuUsedPct} total={totalCpu} />
})

type RamUsageProps = { sandboxId: string; totalMem?: number }
export const RamUsageCellView = React.memo(function RamUsageCellView({
  sandboxId,
  totalMem,
}: RamUsageProps) {
  const memUsedMb = useSandboxMetricsStore(
    (s) => s.metrics?.[sandboxId]?.memUsedMb
  )
  return <ResourceUsage type="mem" metrics={memUsedMb} total={totalMem} />
})

type DiskUsageProps = { sandboxId: string }
export const DiskUsageCellView = React.memo(function DiskUsageCellView({
  sandboxId,
}: DiskUsageProps) {
  const diskUsedGb = useSandboxMetricsStore(
    (s) => s.metrics?.[sandboxId]?.diskUsedGb
  )
  const diskTotalGb = useSandboxMetricsStore(
    (s) => s.metrics?.[sandboxId]?.diskTotalGb
  )
  return <ResourceUsage type="disk" metrics={diskUsedGb} total={diskTotalGb} />
})

export const CpuUsageCell = ({
  row,
}: CellContext<SandboxWithMetrics, unknown>) => (
  <CpuUsageCellView
    sandboxId={row.original.sandboxID}
    totalCpu={row.original.cpuCount}
  />
)

export const RamUsageCell = ({
  row,
}: CellContext<SandboxWithMetrics, unknown>) => (
  <RamUsageCellView
    sandboxId={row.original.sandboxID}
    totalMem={row.original.memoryMB}
  />
)

export const DiskUsageCell = ({
  row,
}: CellContext<SandboxWithMetrics, unknown>) => {
  const metrics = useSandboxMetricsStore(
    (s) => s.metrics?.[row.original.sandboxID]
  )

  const diskSizeGB = useMemo(() => {
    const diskSizeMB = row.original.diskSizeMB

    return diskSizeMB / 1024
  }, [row.original.diskSizeMB])

  return (
    <ResourceUsage
      type="disk"
      metrics={metrics?.diskUsedGb}
      total={diskSizeGB}
    />
  )
}

// ---------- Generic column cell components ----------

export function IdCell({ getValue }: CellContext<SandboxWithMetrics, unknown>) {
  return (
    <div className="text-fg-tertiary overflow-x-hidden prose-table select-all">
      {getValue() as string}
    </div>
  )
}

export function TemplateCell({
  getValue,
  table,
}: CellContext<SandboxWithMetrics, unknown>) {
  const templateId = getValue() as string
  const template: Template | undefined = table
    .getState()
    .templates?.find((t: Template) => t.templateID === templateId)
  const { selectedTeamSlug, selectedTeamId } = useServerContext()
  const router = useRouter()

  if (!selectedTeamSlug || !selectedTeamId) return null

  return (
    <Button
      variant="link"
      className="text-fg h-auto p-0 font-sans prose-table normal-case"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()

        useTemplateTableStore.getState().setGlobalFilter(templateId)
        router.push(
          PROTECTED_URLS.TEMPLATES(selectedTeamSlug ?? selectedTeamId)
        )
      }}
    >
      {template?.aliases?.[0] ?? templateId}
      <ArrowUpRight className="size-3" />
    </Button>
  )
}

export function MetadataCell({
  getValue,
}: CellContext<SandboxWithMetrics, unknown>) {
  const value = getValue() as string
  const json = useMemo(() => JSON.parse(value), [value])

  if (value.trim() === '{}') {
    return <span className="text-fg-tertiary">n/a</span>
  }

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline"
      json={json}
    >
      {value}
    </JsonPopover>
  )
}

export function StartedAtCell({
  getValue,
}: CellContext<SandboxWithMetrics, unknown>) {
  const dateValue = getValue() as string
  const dateComponents = useMemo(
    () => parseUTCDateComponents(dateValue),
    [dateValue]
  )

  return (
    <div className="whitespace-nowrap overflow-x-hidden font-mono prose-table-numeric select-all">
      <span className="text-fg-tertiary">{`${dateComponents.day} ${dateComponents.date} ${dateComponents.month} ${dateComponents.year}`}</span>{' '}
      <span className="text-fg">{dateComponents.time}</span>{' '}
      <span className="text-fg-tertiary">{dateComponents.timezone}</span>
    </div>
  )
}
