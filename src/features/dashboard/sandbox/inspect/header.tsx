'use client'

import { Badge } from '@/ui/primitives/badge'
import { Circle } from 'lucide-react'

export default function SandboxInspectHeader() {
  return (
    <div className="flex items-center gap-2 p-4 pb-0 md:px-10 md:pt-8">
      <Badge variant="contrast-1" className="h-8 gap-2">
        <Circle className="size-2 animate-pulse fill-current" />
        Live File System
      </Badge>
    </div>
  )
}
