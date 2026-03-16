'use client'

import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { BlockIcon, MetadataIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'

export default function Metadata() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo?.metadata) {
    return (
      <Badge>
        <BlockIcon className="size-3.5" /> N/A
      </Badge>
    )
  }

  return (
    <JsonPopover
      json={sandboxInfo?.metadata}
    >
      <MetadataIcon className="size-3.5" />
      Metadata
    </JsonPopover>
  )
}
