import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import RanFor from './ran-for'
import Status from './status'
import Resource from './resource'
import RemainingTime from './remaining-time'
import RefreshControl from './refresh'
import TemplateId from './template-id'
import StartedAt from './started-at'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import Metadata from './metadata'

interface SandboxDetailsHeaderProps {
  teamIdOrSlug: string
  sandboxInfo: SandboxInfo
}

export default async function SandboxDetailsHeader({
  teamIdOrSlug,
  sandboxInfo,
}: SandboxDetailsHeaderProps) {
  const sandboxId = sandboxInfo.sandboxID + '-' + sandboxInfo.clientID

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
    memoryMB: {
      label: 'mem',
      value: <Resource type="mem" value={sandboxInfo.memoryMB?.toString()} />,
    },
    cpuCount: {
      label: 'cpu',
      value: <Resource type="cpu" value={sandboxInfo.cpuCount?.toString()} />,
    },
  }

  return (
    <header className="flex w-full flex-col gap-8 p-4 max-md:py-2">
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
          <h1 className="text-fg-500 text-xl font-bold md:text-2xl">
            <span className="text-fg">{sandboxId}</span>'S DETAILS
          </h1>
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
