'use client'

import CopyButton from '@/ui/copy-button'
import { Badge } from '@/ui/primitives/badge'
import { useSandboxContext } from '../context'
import { useMemo } from 'react'

export default function TemplateId() {
  const { sandboxInfo } = useSandboxContext()

  console.log('sandboxInfo', sandboxInfo)

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
