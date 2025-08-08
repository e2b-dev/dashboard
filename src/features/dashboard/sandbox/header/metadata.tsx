'use client'

import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CircleSlash } from 'lucide-react'
import { useSandboxContext } from '../context'

export default function Metadata() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo?.metadata) {
    return (
      <Badge>
        <CircleSlash className="size-3" /> Empty
      </Badge>
    )
  }

  return (
    <JsonPopover json={sandboxInfo.metadata}>
      <Button variant="accent">Show Metadata</Button>
    </JsonPopover>
  )
}
