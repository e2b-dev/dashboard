'use client'

import { Skeleton } from '@/ui/primitives/skeleton'
import { DetailsItem, DetailsRow } from '../../layouts/details-row'
import { useSandboxContext } from '../context'
import EndedAt from './ended-at'
import Metadata from './metadata'
import RanFor from './ran-for'
import RemainingTime from './remaining-time'
import { ResourceUsageClient } from './resource-usage-client'
import StartedAt from './started-at'
import Status from './status'
import TemplateId from './template-id'

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
  const cpuUsageContent = <ResourceUsageClient type="cpu" mode="usage" />
  const memoryUsageContent = <ResourceUsageClient type="mem" mode="usage" />
  const diskUsageContent = <ResourceUsageClient type="disk" mode="usage" />

  const renderContent = (content: React.ReactNode, skeletonWidth: string) =>
    isInitialLoading ? <Skeleton className={`h-5 ${skeletonWidth}`} /> : content

  return (
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
        <DetailsItem label="status">
          {renderContent(statusContent, 'w-20')}
        </DetailsItem>
        <DetailsItem label="template">
          {renderContent(templateContent, 'w-28')}
        </DetailsItem>
        <DetailsItem label="metadata">
          {renderContent(metadataContent, 'w-20')}
        </DetailsItem>
        <DetailsItem label={timeoutLabel}>
          {renderContent(timeoutContent, 'w-22')}
        </DetailsItem>
        <DetailsItem label="created at">
          {renderContent(createdAtContent, 'w-32')}
        </DetailsItem>
        <DetailsItem label={runningLabel}>
          {renderContent(runningDurationContent, 'w-22')}
        </DetailsItem>
        <DetailsItem label="CPU Usage">
          {renderContent(cpuUsageContent, 'w-20')}
        </DetailsItem>
        <DetailsItem label="Memory Usage">
          {renderContent(memoryUsageContent, 'w-20')}
        </DetailsItem>
        <DetailsItem label="Disk Usage">
          {renderContent(diskUsageContent, 'w-20')}
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
