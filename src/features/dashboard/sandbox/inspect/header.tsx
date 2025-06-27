'use client'

import { cn } from '@/lib/utils'
import { ArrowRight, ChevronRight, ChevronsRight, Circle } from 'lucide-react'
import RootPathInput from './root-path-input'
import { Separator } from '@/ui/primitives/separator'
import { Badge } from '@/ui/primitives/badge'

interface SandboxInspectHeaderProps {
  className?: string
  rootPath: string
}

export default function SandboxInspectHeader({
  className,
  rootPath,
}: SandboxInspectHeaderProps) {
  return (
    <div className={cn('flex w-fit items-center gap-3 p-2', className)}>
      <div className="flex w-full items-center gap-2">
        <Badge variant="contrast-1" className="whitespace-nowrap">
          <span className="animate-pulse">WATCHING {'>>>'}</span>
        </Badge>
        <RootPathInput className="w-full max-w-70" initialValue={rootPath} />
      </div>
    </div>
  )
}
