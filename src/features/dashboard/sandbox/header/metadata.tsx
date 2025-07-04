'use client'

import { SandboxInfo } from '@/types/api'
import { Button } from '@/ui/primitives/button'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'

interface MetadataProps {
  metadata?: SandboxInfo['metadata']
}

export default function Metadata({ metadata }: MetadataProps) {
  const className = 'h-6'

  if (!metadata) {
    return (
      <Badge variant="muted" className={className}>
        No Metadata
      </Badge>
    )
  }

  return (
    <JsonPopover json={metadata}>
      <Button variant="accent" size="sm" className={className}>
        Show Metadata
      </Button>
    </JsonPopover>
  )
}
