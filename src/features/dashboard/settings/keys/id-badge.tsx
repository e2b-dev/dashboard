'use client'

import { useClipboard } from '@/lib/hooks/use-clipboard'
import { Badge } from '@/ui/primitives/badge'
import { IconButton } from '@/ui/primitives/icon-button'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'

/** Builds the visible uppercase ID badge label; e.g. "e2b_c28e178eecf2" -> "E2B_...ECF2". */
const getIdBadgeLabel = (id: string): string => {
  if (id.length <= 8) return id.toUpperCase()
  return `${id.slice(0, 4)}...${id.slice(-4)}`.toUpperCase()
}

interface IdBadgeProps {
  id: string
}

export const IdBadge = ({ id }: IdBadgeProps) => {
  const [wasCopied, copy] = useClipboard()
  const displayId = getIdBadgeLabel(id)

  const handleCopy = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void copy(id)
  }

  return (
    <Badge
      className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 prose-label-numeric"
      size="sm"
    >
      <span>{displayId}</span>
      <IconButton
        type="button"
        className="active:translate-y-0"
        aria-label="Copy full ID"
        onClick={handleCopy}
      >
        {wasCopied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </IconButton>
    </Badge>
  )
}
