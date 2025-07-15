import LogoWithoutText from '../../../ui/logo-without-text'
import { Badge } from '../../../ui/primitives/badge'
import HelpTooltip from '@/ui/help-tooltip'

export function ByE2BBadge() {
  return (
    <HelpTooltip
      trigger={
        <Badge className="bg-bg-400 border-border-200 h-4.5 gap-1 border pr-0 pl-1">
          BY
          <LogoWithoutText className="-ml-1 h-4 w-4 min-w-4" />
        </Badge>
      }
    >
      <p className="text-fg-300 font-sans text-xs whitespace-break-spaces">
        This template was created by E2B. It is one of the default templates
        every user has access to.
      </p>
    </HelpTooltip>
  )
}
