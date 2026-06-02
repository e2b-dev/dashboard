import { formatNumber } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import {
  CpuIcon,
  MemoryIcon,
  MetadataIcon,
  StorageIcon,
} from '@/ui/primitives/icons'

interface TemplateSpecsProps {
  build: {
    cpuCount: number | null
    memoryMB: number | null
    diskSizeMB: number | null
    envdVersion: string | null
  }
  className?: string
}

export function TemplateSpecs({ build, className }: TemplateSpecsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-secondary prose-body-numeric',
        className
      )}
    >
      <SpecItem icon={<CpuIcon className="size-3" />}>
        <span className="prose-body-numeric-highlight">
          {build.cpuCount === null ? '—' : formatNumber(build.cpuCount)}
        </span>{' '}
        <span className="text-fg-tertiary">
          Core{build.cpuCount !== null && build.cpuCount > 1 ? 's' : ''}
        </span>
      </SpecItem>
      <Separator />
      <SpecItem icon={<MemoryIcon className="size-3" />}>
        <span className="prose-body-numeric-highlight">
          {build.memoryMB === null ? '—' : formatNumber(build.memoryMB)}
        </span>{' '}
        <span className="text-fg-tertiary">MB</span>
      </SpecItem>
      {build.diskSizeMB !== null && (
        <>
          <Separator />
          <SpecItem icon={<StorageIcon className="size-3" />}>
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
          <SpecItem icon={<MetadataIcon className="size-3" />}>
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
