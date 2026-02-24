'use client'

import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Braces, CircleSlash } from 'lucide-react'
import { useSandboxContext } from '../context'

export default function Metadata() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo?.metadata) {
    return (
      <Badge>
        <CircleSlash className="size-3.5" /> N/A
      </Badge>
    )
  }

  return (
    <JsonPopover
      json={sandboxInfo?.metadata}
    >
      <Braces className="size-3.5" />
      Metadata
    </JsonPopover>
  )
}
