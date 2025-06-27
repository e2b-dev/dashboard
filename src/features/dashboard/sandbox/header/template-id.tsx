'use client'

import { SandboxInfo } from '@/types/api'
import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'

interface TemplateIdProps {
  templateID: SandboxInfo['templateID']
}

export default function TemplateId({ templateID }: TemplateIdProps) {
  return (
    <Badge variant="contrast-2" className="gap-2.5">
      <p>{templateID?.toString()}</p>
      <CopyButton
        size="slate"
        className="size-3.5"
        variant="ghost"
        value={templateID?.toString() ?? ''}
      />
    </Badge>
  )
}
