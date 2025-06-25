'use client'

import { cn } from '@/lib/utils'
import { ChevronRight, Circle } from 'lucide-react'
import RootPathInput from './root-path-input'
import { Separator } from '@/ui/primitives/separator'

interface SandboxInspectHeaderProps {
  className?: string
  rootPath: string
}

export default function SandboxInspectHeader({
  className,
  rootPath,
}: SandboxInspectHeaderProps) {
  return (
    <div className="flex h-16 flex-col justify-end px-4 md:px-10">
      <div
        className={cn(
          'flex w-fit items-center gap-3 rounded-sm p-2',
          className
        )}
      >
        <Circle className="text-fg-300 size-3 animate-pulse fill-current" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          Root Path
          <ChevronRight className="text-fg-300 size-3" />
          <RootPathInput initialValue={rootPath} />
        </div>
      </div>
    </div>
  )
}
