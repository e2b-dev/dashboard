'use client'

import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Braces, CircleSlash } from 'lucide-react'
import { useSandboxContext } from '../context'

export default function Metadata() {
  const { sandboxInfo } = useSandboxContext()

  // TODO: remove mock metadata
  const mockMetadata = { env: 'production', version: '1.2.3', user: 'test-user' }

  if (!sandboxInfo?.metadata && !mockMetadata) {
    return (
      <Badge>
        <CircleSlash className="size-3.5" /> N/A
      </Badge>
    )
  }

  return (
    <JsonPopover
      json={sandboxInfo?.metadata || mockMetadata}
    >
      <Braces className="size-3.5" />
      Metadata
    </JsonPopover>
  )
}
