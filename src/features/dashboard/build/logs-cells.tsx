import { formatDurationCompact } from '@/lib/utils/formatting'
import { BuildLogDTO } from '@/server/api/models/builds.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge, BadgeProps } from '@/ui/primitives/badge'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'

interface LogLevelProps {
  level: BuildLogDTO['level']
}

const mapLogLevelToBadgeProps: Record<BuildLogDTO['level'], BadgeProps> = {
  debug: {
    variant: 'default',
  },
  info: {
    variant: 'info',
  },
  warn: {
    variant: 'warning',
  },
  error: {
    variant: 'error',
  },
}

export const LogLevel = ({ level }: LogLevelProps) => {
  return (
    <Badge {...mapLogLevelToBadgeProps[level]} className="uppercase h-[18px]">
      {level}
    </Badge>
  )
}

interface TimestampProps {
  timestampUnix: number
  millisAfterStart: number
}

export const Timestamp = ({
  timestampUnix,
  millisAfterStart,
}: TimestampProps) => {
  const date = new Date(timestampUnix)

  return (
    <CopyButtonInline
      value={date.toISOString()}
      className="font-mono group prose-table-numeric truncate"
    >
      {formatDurationCompact(millisAfterStart, true)}{' '}
      <span className="group-hover:text-current transition-colors text-fg-tertiary">
        {format(date, 'hh:mm:ss.SS a', {
          locale: enUS,
        })}
      </span>
    </CopyButtonInline>
  )
}

interface MessageProps {
  message: BuildLogDTO['message']
}

export const Message = ({ message }: MessageProps) => {
  return <span className="prose-body whitespace-nowrap">{message}</span>
}
