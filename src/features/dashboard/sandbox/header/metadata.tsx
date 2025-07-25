'use client'

import { Button } from '@/ui/primitives/button'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { useSandboxContext } from '../context'
import { CircleSlash } from 'lucide-react'

export default function Metadata() {
  const { sandboxInfo } = useSandboxContext()
  const className = 'h-6'

  if (!sandboxInfo?.metadata) {
    return (
      <Badge variant="muted" className={className}>
        <CircleSlash className="size-3" /> Empty
      </Badge>
    )
  }

  return (
    <JsonPopover json={sandboxInfo.metadata}>
      <Button variant="accent" size="sm" className={className}>
        Show Metadata
      </Button>
    </JsonPopover>
  )
}
