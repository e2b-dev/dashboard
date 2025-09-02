import { COOKIE_KEYS } from '@/configs/keys'
import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api'
import { ChevronLeftIcon } from 'lucide-react'
import { cookies } from 'next/headers'
import Link from 'next/link'
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

  const headerItems = {
    state: {
      label: 'status',
      value: <Status />,
    },
    templateID: {
      label: 'template',
      value: <TemplateId />,
    },
    metadata: {
      label: 'metadata',
      value: <Metadata />,
    },
    remainingTime: {
      label: 'timeout in',
      value: <RemainingTime />,
    },
    startedAt: {
      label: 'created at',
      value: <StartedAt />,
    },
    endAt: {
      label: state === 'running' ? 'running for' : 'ran for',
      value: <RanFor />,
    },
    cpuCount: {
      label: 'CPU Usage',
      value: <ResourceUsageClient type="cpu" mode="usage" />,
    },
    memoryMB: {
      label: 'Memory Usage',
      value: <ResourceUsageClient type="mem" mode="usage" />,
    },
    diskGB: {
      label: 'Disk Usage',
      value: <ResourceUsageClient type="disk" mode="usage" />,
    },
  }

  return (
    <header className="bg-bg relative z-30 flex w-full flex-col gap-6 p-3 md:p-6 max-md:pt-0">
      <div className="flex flex-col sm:gap-2 md:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={PROTECTED_URLS.SANDBOXES(teamIdOrSlug, 'list')}
            className="!text-fg-tertiary hover:!text-fg flex items-center gap-1 prose-body-highlight transition-colors"
            prefetch
            shallow
          >
            <ChevronLeftIcon className="size-4" />
            Sandboxes
          </Link>
          <SandboxDetailsTitle />
        </div>
        <RefreshControl
          initialPollingInterval={
            initialPollingInterval
              ? parseInt(initialPollingInterval)
              : undefined
          }
          className="pt-4 sm:pt-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-5 md:gap-7">
        {Object.entries(headerItems).map(([key, { label, value }]) => (
          <HeaderItem key={key} label={label} value={value} />
        ))}
      </div>
    </header>
  )
}

interface HeaderItemProps {
  label: string
  value: string | React.ReactNode
}

function HeaderItem({ label, value }: HeaderItemProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-fg-tertiary text-xs uppercase">{label}</span>
      {typeof value === 'string' ? <p className="">{value}</p> : value}
    </div>
  )
}
