'use client'

import type { ReactNode } from 'react'
import { Skeleton } from '@/ui/primitives/skeleton'
import { DetailsItem, DetailsRow } from '../../layouts/details-row'
import { useSandboxContext } from '../context'
import EndedAt from './ended-at'
import Metadata from './metadata'
import RanFor from './ran-for'
import RemainingTime from './remaining-time'
import { CpuSpecItem, DiskSpecItem, MemorySpecItem } from './spec-items'
import StartedAt from './started-at'
import Status from './status'
import TemplateId from './template-id'

interface HeaderDetailItem {
  label: string
  content: ReactNode
  skeletonWidth: string
}

export default function SandboxDetailsHeader() {
  const { isRunning, sandboxInfo, isSandboxInfoLoading } = useSandboxContext()

  const isInitialLoading = isSandboxInfoLoading && !sandboxInfo
  const isKilled = sandboxInfo?.state === 'killed'
  const isPaused = sandboxInfo?.state === 'paused'

  const runningLabel = isInitialLoading || isRunning ? 'running for' : 'ran for'
  const timeoutLabel = isKilled
    ? 'stopped at'
    : isPaused
      ? 'paused at'
      : 'timeout in'

  const timeoutContent = isKilled || isPaused ? <EndedAt /> : <RemainingTime />
  const statusContent = <Status />
  const templateContent = <TemplateId />
  const metadataContent = <Metadata />
  const createdAtContent = <StartedAt />
  const runningDurationContent = <RanFor />
  const cpuSpecContent = <CpuSpecItem />
  const memorySpecContent = <MemorySpecItem />
  const diskSpecContent = <DiskSpecItem />

  const renderContent = (content: React.ReactNode, skeletonWidth: string) =>
    isInitialLoading ? <Skeleton className={`h-5 ${skeletonWidth}`} /> : content

  const items: HeaderDetailItem[] = [
    { label: 'status', content: statusContent, skeletonWidth: 'w-20' },
    { label: 'template', content: templateContent, skeletonWidth: 'w-28' },
    { label: 'metadata', content: metadataContent, skeletonWidth: 'w-20' },
    { label: 'created at', content: createdAtContent, skeletonWidth: 'w-32' },
    { label: timeoutLabel, content: timeoutContent, skeletonWidth: 'w-22' },
    {
      label: runningLabel,
      content: runningDurationContent,
      skeletonWidth: 'w-22',
    },
    { label: 'CPU', content: cpuSpecContent, skeletonWidth: 'w-20' },
    { label: 'Memory', content: memorySpecContent, skeletonWidth: 'w-20' },
    { label: 'Disk', content: diskSpecContent, skeletonWidth: 'w-20' },
  ]

  return (
    <header className="bg-bg relative z-30 w-full border-b px-3 py-4 md:px-6 md:py-5">
      <DetailsRow className="gap-x-5 gap-y-4 md:gap-x-7 md:gap-y-4">
        {items.map((item) => (
          <DetailsItem key={item.label} label={item.label}>
            {renderContent(item.content, item.skeletonWidth)}
          </DetailsItem>
        ))}
      </DetailsRow>
    </header>
  )
}
