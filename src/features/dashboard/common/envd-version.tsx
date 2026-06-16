import { cn } from '@/lib/utils'
import { isVersionCompatible } from '@/lib/utils/version'
import HelpTooltip from '@/ui/help-tooltip'

const INVALID_ENVD_VERSION = '0.0.1'
const SDK_V2_MINIMAL_ENVD_VERSION = '0.2.0'

export function EnvdVersion({
  version,
  className,
}: {
  version: string | null | undefined
  className?: string
}) {
  const versionValue =
    version && version !== INVALID_ENVD_VERSION ? version : null

  const isNotV2Compatible = versionValue
    ? isVersionCompatible(versionValue, SDK_V2_MINIMAL_ENVD_VERSION) === false
    : false

  return (
    <div
      className={cn(
        'text-fg-tertiary whitespace-nowrap font-mono flex flex-row gap-1.5',
        { 'text-accent-error-highlight': isNotV2Compatible },
        className
      )}
    >
      {versionValue ?? '--'}
      {isNotV2Compatible && (
        <HelpTooltip>
          The envd version is not compatible with the SDK v2. To update the envd
          version, you need to rebuild the template.
        </HelpTooltip>
      )}
    </div>
  )
}
