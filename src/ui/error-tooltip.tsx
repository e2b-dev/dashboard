import { AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './primitives/tooltip'

interface ErrorTooltipProps {
  children: React.ReactNode
  trigger?: React.ReactNode
}

export default function ErrorTooltip({ children, trigger }: ErrorTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} type="button">
          {trigger || (
            <AlertTriangle className="text-accent-error-highlight size-4" />
          )}
        </TooltipTrigger>
        <TooltipContent className="bg-accent-error-bg-large border-accent-error-highlight text-fg-secondary max-w-[200px] p-2 font-sans text-xs normal-case">
          <AlertTriangle className="text-accent-error-highlight mb-2 size-4" />
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
