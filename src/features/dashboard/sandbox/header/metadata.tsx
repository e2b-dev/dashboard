'use client'

import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
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
    <JsonPopover json={sandboxInfo.metadata}>
      <Button
        variant="accent"
        size="sm"
        className="h-5 font-sans prose-label-highlight"
      >
        <Braces className="size-3.5" />
        Metadata
      </Button>
    </JsonPopover>
  )
}
