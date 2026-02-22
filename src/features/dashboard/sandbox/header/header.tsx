import { COOKIE_KEYS } from '@/configs/cookies'
import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api.types'
import { ChevronLeftIcon } from 'lucide-react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { DetailsItem, DetailsRow } from '../../layouts/details-row'
import KillButton from './kill-button'
import Metadata from './metadata'
import RanFor from './ran-for'
import RefreshControl from './refresh'
import RemainingTime from './remaining-time'
import { ResourceUsageClient } from './resource-usage-client'
import StartedAt from './started-at'
import Status from './status'
import TemplateId from './template-id'
import SandboxDetailsTitle from './title'

interface SandboxDetailsHeaderProps {
  teamIdOrSlug: string
  state: SandboxInfo['state']
}

export default async function SandboxDetailsHeader({
  teamIdOrSlug,
  state,
}: SandboxDetailsHeaderProps) {
  const initialPollingInterval = (await cookies()).get(
    COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL
  )?.value

  return (
    <header className="bg-bg relative z-30 flex w-full flex-col gap-6 p-3 md:p-6 max-md:pt-0">
      <div className="flex flex-col sm:gap-2 md:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={PROTECTED_URLS.SANDBOXES_LIST(teamIdOrSlug)}
            className="text-fg-tertiary! hover:text-fg! flex items-center gap-1 prose-body-highlight transition-colors"
            prefetch
            shallow
          >
            <ChevronLeftIcon className="size-4" />
            Sandboxes
          </Link>
          <SandboxDetailsTitle />
        </div>
        <div className="flex items-center gap-1 pt-4 sm:pt-0">
          <RefreshControl
            initialPollingInterval={
              initialPollingInterval
                ? parseInt(initialPollingInterval)
                : undefined
            }
            className="order-2 sm:order-1"
          />
          <KillButton className="order-1 sm:order-2" />
        </div>
      </div>

      <DetailsRow>
        <DetailsItem label="status">
          <Status />
        </DetailsItem>
        <DetailsItem label="template">
          <TemplateId />
        </DetailsItem>
        <DetailsItem label="metadata">
          <Metadata />
        </DetailsItem>
        <DetailsItem label="timeout in">
          <RemainingTime />
        </DetailsItem>
        <DetailsItem label="created at">
          <StartedAt />
        </DetailsItem>
        <DetailsItem label={state === 'running' ? 'running for' : 'ran for'}>
          <RanFor />
        </DetailsItem>
        <DetailsItem label="CPU Usage">
          <ResourceUsageClient type="cpu" mode="usage" />
        </DetailsItem>
        <DetailsItem label="Memory Usage">
          <ResourceUsageClient type="mem" mode="usage" />
        </DetailsItem>
        <DetailsItem label="Disk Usage">
          <ResourceUsageClient type="disk" mode="usage" />
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
