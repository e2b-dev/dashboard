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
      <h1 className="text-fg font-sans text-xl font-bold md:text-2xl">
        {sandboxInfo.sandboxID}
      </h1>
      <CopyButton
        value={sandboxInfo.sandboxID}
        size="icon"
        variant="ghost"
        className="text-fg-300"
      />
    </div>
  )
}
