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
}

export default function HelpTooltip({ children, trigger }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} type="button">
          {trigger || <InfoIcon className="text-fg-tertiary size-4" />}
        </TooltipTrigger>
        <TooltipContent className="text-fg-secondary max-w-[200px] p-2 font-sans text-xs  normal-case">
          <InfoIcon className="text-fg-tertiary mb-2 size-4" />
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
