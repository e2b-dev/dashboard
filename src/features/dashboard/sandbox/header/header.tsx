import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import RanFor from './ran-for'
import Status from './status'
import RemainingTime from './remaining-time'
import RefreshControl from './refresh'
import TemplateId from './template-id'
import StartedAt from './started-at'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import Metadata from './metadata'
import { ResourceUsageClient } from './resource-usage-client'
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
      value: (
        <ResourceUsageClient
          type="cpu"
          mode="usage"
          classNames={{
            dot: 'mx-1',
          }}
        />
      ),
    },
    memoryMB: {
      label: 'Memory Usage',
      value: (
        <ResourceUsageClient
          type="mem"
          mode="usage"
          classNames={{
            dot: 'mx-1',
          }}
        />
      ),
    },
  }

  return (
    <header className="bg-bg relative z-30 flex w-full flex-col gap-8 p-4 max-md:py-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={PROTECTED_URLS.SANDBOXES(teamIdOrSlug)}
            className="text-fg-300 hover:text-fg flex items-center gap-1.5 transition-colors"
            prefetch
            shallow
          >
            <ChevronLeftIcon className="size-5" />
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
      <span className="text-fg-500 text-xs uppercase">{label}</span>
      {typeof value === 'string' ? <p className="text-sm">{value}</p> : value}
    </div>
  )
}
