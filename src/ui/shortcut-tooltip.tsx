'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from './primitives/tooltip'
import { Kbd, KbdProps } from './primitives/kbd'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from './primitives/separator'

interface ShortcutTooltipProps {
  children: React.ReactNode
  keys: KbdProps['keys']
  label?: ReactNode
}

export default function ShortcutTooltip({
  children,
  keys,
  label,
}: ShortcutTooltipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className={cn(
          'text-fg-300 flex max-w-[200px] items-center gap-1 p-0 font-sans text-xs font-normal normal-case',
          {
            'pr-2': label,
          }
        )}
      >
        <Kbd keys={keys} clientOnlyProps={{ disable: true }} />
        {label && (
          <>
            <Separator orientation="vertical" className="mr-2 h-4" />
            {label}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
