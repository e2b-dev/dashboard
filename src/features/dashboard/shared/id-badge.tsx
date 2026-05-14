'use client'

import type { MouseEvent } from 'react'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'

const getIdBadgeLabel = (id: string): string => {
  if (id.length <= 8) return id.toUpperCase()
  return `${id.slice(0, 4)}...${id.slice(-4)}`.toUpperCase()
}

interface IdBadgeProps {
  id: string
  copyAriaLabel?: string
  onCopied?: () => void
}

export const IdBadge = ({
  id,
  copyAriaLabel = 'Copy full ID',
  onCopied,
}: IdBadgeProps) => {
  const [wasCopied, copy] = useClipboard()
  const displayId = getIdBadgeLabel(id)

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    await copy(id)
    onCopied?.()
  }

  return (
    <Badge className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 align-middle prose-label-numeric">
      <span className="tracking-wider">{displayId}</span>
      <Button
        type="button"
        variant="quaternary"
        size="none"
        className="text-fg-tertiary hover:text-fg h-3.5 w-3.5 shrink-0 active:translate-y-0 [&_svg]:size-3.5"
        aria-label={copyAriaLabel}
        onClick={handleCopy}
      >
        {wasCopied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </Badge>
  )
}
