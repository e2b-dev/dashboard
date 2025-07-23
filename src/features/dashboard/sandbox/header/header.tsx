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
import CopyButton from '@/ui/copy-button'
import { ResourceUsageClient } from './resource-usage-client'

interface SandboxDetailsHeaderProps {
  teamIdOrSlug: string
  sandboxInfo: SandboxInfo
}

export default async function SandboxDetailsHeader({
  teamIdOrSlug,
  sandboxInfo,
}: SandboxDetailsHeaderProps) {
  const initialPollingInterval = (await cookies()).get(
    COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL
  )?.value

  const headerItems = {
    state: {
      label: 'status',
      value: <Status state={sandboxInfo.state} />,
    },
    templateID: {
      label: 'template id',
      value: <TemplateId templateID={sandboxInfo.templateID} />,
    },
    metadata: {
      label: 'metadata',
      value: <Metadata metadata={sandboxInfo.metadata} />,
    },
    remainingTime: {
      label: 'timeout in',
      value: <RemainingTime endAt={sandboxInfo.endAt} />,
    },
    startedAt: {
      label: 'created at',
      value: <StartedAt startedAt={sandboxInfo.startedAt} />,
    },
    endAt: {
      label: sandboxInfo.state === 'running' ? 'running for' : 'ran for',
      value: (
        <RanFor
          state={sandboxInfo.state}
          startedAt={sandboxInfo.startedAt}
          endAt={sandboxInfo.endAt}
        />
      ),
    },
    cpuCount: {
      label: 'CPU Usage',
      value: (
        <ResourceUsageClient
          type="cpu"
          total={sandboxInfo.cpuCount}
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
          total={sandboxInfo.memoryMB}
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
          <div className="flex items-center gap-2">
            <h1 className="text-fg font-sans text-xl font-bold md:text-2xl">
              {sandboxInfo.sandboxID}
            </h1>
            <CopyButton
              value={sandboxInfo.sandboxID}
              size="icon"
              variant="ghost"
              className="text-fg-300"
            />
          </div>
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
