import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api'
import { Label } from '@/ui/primitives/label'
import { ChevronLeftIcon, Dot } from 'lucide-react'
import Link from 'next/link'
import RanFor from './ran-for'
import Status from './status'
import Resource from './resource'
import CreatedAt from './created_at'

interface SandboxDetailsHeaderProps {
  teamIdOrSlug: string
  sandboxInfo: SandboxInfo
}

export default function SandboxDetailsHeader({
  teamIdOrSlug,
  sandboxInfo,
}: SandboxDetailsHeaderProps) {
  const headerItems = {
    state: {
      label: 'status',
      value: <Status state={sandboxInfo.state} />,
    },
    templateID: {
      label: 'template id',
      value: sandboxInfo.templateID?.toString(),
    },
    startedAt: {
      label: 'created at',
      value: <CreatedAt startedAt={sandboxInfo.startedAt} />,
    },
    endAt: {
      label: sandboxInfo.state === 'running' ? 'running since' : 'ran for',
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
    <header className="flex w-full flex-col gap-16 p-8">
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
        <h1 className="text-fg-500 text-2xl font-bold">
          <span className="text-fg">{sandboxInfo.sandboxID}</span>'S DETAILS
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-7">
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
      <Label className="text-fg-500 text-xs uppercase">{label}</Label>
      {typeof value === 'string' ? <p className="text-sm">{value}</p> : value}
    </div>
  )
}
