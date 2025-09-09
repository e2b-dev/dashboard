import { cn } from '@/lib/utils'
import { InfoIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './primitives/tooltip'

interface HelpTooltipProps {
  children: React.ReactNode
  trigger?: React.ReactNode
  classNames?: {
    content?: string
    icon?: string
  }
}

export default function HelpTooltip({
  children,
  trigger,
  classNames,
}: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} type="button" asChild={!!trigger}>
          {trigger || <InfoIcon className="text-fg-tertiary size-4" />}
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            'text-fg-secondary max-w-[200px] p-2 font-sans text-xs  normal-case',
            classNames?.content
          )}
        >
          <InfoIcon
            className={cn('text-fg-tertiary mb-2 size-4', classNames?.icon)}
          />
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
