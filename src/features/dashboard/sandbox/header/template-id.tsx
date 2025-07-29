'use client'

import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
import { useMemo } from 'react'
import { useSandboxContext } from '../context'

export default function TemplateId() {
  const { sandboxInfo } = useSandboxContext()

  const value = useMemo(() => {
    return sandboxInfo?.alias || sandboxInfo?.templateID?.toString() || ''
  }, [sandboxInfo])

  return (
    <Badge variant="contrast-2" className="gap-2.5">
      <p>{value}</p>
      <CopyButton
        size="slate"
        className="size-3.5"
        variant="ghost"
        value={value}
      />
    </Badge>
  )
}
