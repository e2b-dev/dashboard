'use client'

import {
  formatCPUCores,
  formatMemory,
  formatNumber,
} from '@/lib/utils/formatting'
import { CpuIcon, MemoryIcon, StorageIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'

export function CpuSpecItem() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo) {
    return <p>--</p>
  }

  return (
    <p className="flex items-center gap-1.5">
      <CpuIcon className="size-3.5 text-fg-tertiary" />
      {formatCPUCores(sandboxInfo.cpuCount)}
    </p>
  )
}

export function MemorySpecItem() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo) {
    return <p>--</p>
  }

  return (
    <p className="flex items-center gap-1.5">
      <MemoryIcon className="size-3.5 text-fg-tertiary" />
      {formatNumber(sandboxInfo.memoryMB)} MB
    </p>
  )
}

export function DiskSpecItem() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo) {
    return <p>--</p>
  }

  return (
    <p className="flex items-center gap-1.5">
      <StorageIcon className="size-3.5 text-fg-tertiary" />
      {formatMemory(sandboxInfo.diskSizeMB)}
    </p>
  )
}
