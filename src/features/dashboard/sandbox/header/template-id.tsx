'use client'

import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
import { useSandboxContext } from '../context'

export default function TemplateId() {
  const { sandboxInfo } = useSandboxContext()

  return (
    <Badge variant="contrast-2" className="gap-2.5">
      <p>{sandboxInfo?.alias ?? sandboxInfo?.templateID?.toString()}</p>
      <CopyButton
        size="slate"
        className="size-3.5"
        variant="ghost"
        value={sandboxInfo?.alias ?? sandboxInfo?.templateID?.toString() ?? ''}
      />
    </Badge>
  )
}
