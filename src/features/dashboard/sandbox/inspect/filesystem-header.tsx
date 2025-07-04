'use client'

import { cn } from '@/lib/utils'
import RootPathInput from './root-path-input'

interface SandboxInspectHeaderProps {
  className?: string
  rootPath: string
}

export default function SandboxInspectHeader({
  className,
  rootPath,
}: SandboxInspectHeaderProps) {
  return (
    <div className={cn('flex h-full w-full items-center gap-3', className)}>
      <div className="flex h-full w-full items-center gap-2">
        <span className="text-fg-500 ml-2">{'$'}</span>
        <RootPathInput className="w-full" initialValue={rootPath} />
      </div>
    </div>
  )
}
