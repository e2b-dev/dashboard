import { formatNumber } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import {
  CodeChevronIcon,
  CpuIcon,
  MemoryIcon,
  StorageIcon,
} from '@/ui/primitives/icons'

interface TemplateSpecsProps {
  build: {
    cpuCount: number
    memoryMB: number
    diskSizeMB: number | null
    envdVersion: string | null
  }
  className?: string
}

export function TemplateSpecs({ build, className }: TemplateSpecsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-secondary prose-body-numeric',
        className
      )}
    >
      <SpecItem icon={<CpuIcon className="size-3.5" />}>
        <span className="prose-body-numeric-highlight">
          {formatNumber(build.cpuCount)}
        </span>{' '}
        <span className="text-fg-tertiary">
          Core{build.cpuCount > 1 ? 's' : ''}
        </span>
      </SpecItem>
      <Separator />
      <SpecItem icon={<MemoryIcon className="size-3.5" />}>
        <span className="prose-body-numeric-highlight">
          {formatNumber(build.memoryMB)}
        </span>{' '}
        <span className="text-fg-tertiary">MB</span>
      </SpecItem>
      {build.diskSizeMB !== null && (
        <>
          <Separator />
          <SpecItem icon={<StorageIcon className="size-3.5" />}>
            <span className="prose-body-numeric-highlight">
              {formatNumber(build.diskSizeMB)}
            </span>{' '}
            <span className="text-fg-tertiary">MB</span>
          </SpecItem>
        </>
      )}
      {build.envdVersion && (
        <>
          <Separator />
          <SpecItem icon={<CodeChevronIcon className="size-3.5" />}>
            <span className="prose-body-numeric-highlight font-mono">
              {build.envdVersion}
            </span>
          </SpecItem>
        </>
      )}
    </div>
  )
}

function SpecItem({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-icon-tertiary">{icon}</span>
      {children}
    </span>
  )
}

function Separator() {
  return <span className="text-fg-tertiary select-none">·</span>
}
