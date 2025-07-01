'use client'

import { SandboxInfo } from '@/types/api'
import { Button } from '@/ui/primitives/button'
import { JsonPopover } from '@/ui/json-popover'

interface MetadataProps {
  metadata?: SandboxInfo['metadata']
}

export default function Metadata({ metadata }: MetadataProps) {
  const className = 'h-6'

  if (!metadata) {
    return (
      <Button disabled variant="muted" size="sm" className={className}>
        No Metadata
      </Button>
    )
  }

  return (
    <JsonPopover json={metadata}>
      <Button variant="muted" size="sm" className={className}>
        Metadata
      </Button>
    </JsonPopover>
  )
}
