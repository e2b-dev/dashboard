'use client'

import { Skeleton } from '@/ui/primitives/skeleton'
import { DetailsItem, DetailsRow } from '../../layouts/details-row'
import { useSandboxContext } from '../context'
import Metadata from './metadata'
import RanFor from './ran-for'
import RemainingTime from './remaining-time'
import { ResourceUsageClient } from './resource-usage-client'
import StartedAt from './started-at'
import Status from './status'
import StoppedAt from './stopped-at'
import TemplateId from './template-id'

export default function SandboxDetailsHeader() {
  const { isRunning, sandboxInfo, isSandboxInfoLoading } = useSandboxContext()
  const isInitialLoading = isSandboxInfoLoading && !sandboxInfo
  const isKilled = sandboxInfo?.state === 'killed'
  const runningLabel = isInitialLoading || isRunning ? 'running for' : 'ran for'

  return (
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
        <DetailsItem label="status">
          {isInitialLoading ? <Skeleton className="h-5 w-20" /> : <Status />}
        </DetailsItem>
        <DetailsItem label="template">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <TemplateId />
          )}
        </DetailsItem>
        <DetailsItem label="metadata">
          {isInitialLoading ? <Skeleton className="h-5 w-20" /> : <Metadata />}
        </DetailsItem>
        <DetailsItem label={isKilled ? 'stopped at' : 'timeout in'}>
          {isInitialLoading ? (
            <Skeleton className="h-5 w-22" />
          ) : isKilled ? (
            <StoppedAt />
          ) : (
            <RemainingTime />
          )}
        </DetailsItem>
        <DetailsItem label="created at">
          {isInitialLoading ? <Skeleton className="h-5 w-32" /> : <StartedAt />}
        </DetailsItem>
        <DetailsItem label={runningLabel}>
          {isInitialLoading ? <Skeleton className="h-5 w-22" /> : <RanFor />}
        </DetailsItem>
        <DetailsItem label="CPU Usage">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <ResourceUsageClient type="cpu" mode="usage" />
          )}
        </DetailsItem>
        <DetailsItem label="Memory Usage">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <ResourceUsageClient type="mem" mode="usage" />
          )}
        </DetailsItem>
        <DetailsItem label="Disk Usage">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <ResourceUsageClient type="disk" mode="usage" />
          )}
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
