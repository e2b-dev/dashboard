'use client'

import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function Title() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <h2 className="text-fg prose-headline-small">{sandboxInfo.sandboxID}</h2>
      <CopyButton
        value={sandboxInfo.sandboxID}
        size="icon"
        variant="ghost"
        className="text-fg-secondary"
      />
    </div>
  )
}
