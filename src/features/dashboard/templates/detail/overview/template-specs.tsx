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
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-tertiary prose-body-numeric',
        className
      )}
    >
      <SpecItem icon={<CpuIcon className="size-3" />}>
        {build.cpuCount === null ? '—' : formatNumber(build.cpuCount)} Core
        {build.cpuCount !== null && build.cpuCount > 1 ? 's' : ''}
      </SpecItem>
      <Separator />
      <SpecItem icon={<MemoryIcon className="size-3" />}>
        {build.memoryMB === null ? '—' : formatNumber(build.memoryMB)} MB
      </SpecItem>
      {build.diskSizeMB !== null && (
        <>
          <Separator />
          <SpecItem icon={<StorageIcon className="size-3" />}>
            {formatNumber(build.diskSizeMB)} MB
          </SpecItem>
        </>
      )}
      {build.envdVersion && (
        <>
          <Separator />
          <SpecItem icon={<MetadataIcon className="size-3" />}>
            <span className="font-mono">{build.envdVersion}</span>
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
  return <span className="select-none">·</span>
}
