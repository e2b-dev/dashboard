import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxInfo } from '@/types/api'
import { Label } from '@/ui/primitives/label'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

interface SandboxDetailsHeaderProps {
  teamIdOrSlug: string
  sandboxInfo: SandboxInfo
}

export default async function SandboxDetailsHeader({
  teamIdOrSlug,
  sandboxInfo,
}: SandboxDetailsHeaderProps) {
  return (
    <header className="flex w-full flex-col gap-16 p-8">
      <div className="flex flex-col gap-1">
        <Link
          href={PROTECTED_URLS.SANDBOXES(teamIdOrSlug)}
          className="text-fg-300 hover:text-fg flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeftIcon className="size-5" />
          Sandboxes
        </Link>
        <h1 className="text-fg-300 text-2xl font-bold">
          <span className="text-fg">{sandboxInfo.sandboxID}</span>'S DETAILS
        </h1>
      </div>
      <div className="flex items-center gap-7">
        {Object.entries(sandboxInfo).map(([key, value]) => (
          <div key={key}>
            <Label className="text-fg-500 text-xs uppercase">{key}</Label>
            <p className="text-sm">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </p>
          </div>
        ))}
      </div>
    </header>
  )
}
