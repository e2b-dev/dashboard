'use client'

import { TAG_MAX_LENGTH } from './helpers'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'

interface TagFormatInvalidTooltipProps {
  maxLength?: number
}

export default function TagFormatInvalidTooltip({
  maxLength = TAG_MAX_LENGTH,
}: TagFormatInvalidTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="prose-body whitespace-nowrap text-accent-error-highlight decoration-dotted underline-offset-2">
          Invalid format
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        alignOffset={-13}
        sideOffset={12}
        className="max-w-[260px]"
      >
        <p className="prose-body font-mono text-fg-secondary">
          <span className="font-sans text-fg-tertiary">Allowed: </span>
          <span className="text-fg">a-z</span>,
          <span className="text-fg">0-9</span>
          <span className="text-fg-tertiary">,(</span>
          <span className="text-fg">.</span>
          <span className="text-fg-tertiary">)</span>
          <span className="text-fg-tertiary">,(</span>
          <span className="text-fg">_</span>
          <span className="text-fg-tertiary">)</span>
          <span className="text-fg-tertiary">,(</span>
          <span className="text-fg">-</span>
          <span className="text-fg-tertiary">)</span>
          <br />
          <span className="font-sans text-fg-tertiary">
            Max {maxLength} characters
          </span>
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
