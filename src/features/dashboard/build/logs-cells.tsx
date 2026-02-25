import { formatDurationCompact } from '@/lib/utils/formatting'
import { LogLevelBadge, LogMessage } from '@/features/dashboard/common/log-cells'
import type { BuildLogDTO } from '@/server/api/models/builds.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'

export const LogLevel = ({ level }: { level: BuildLogDTO['level'] }) => {
  return <LogLevelBadge level={level} />
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
  return <LogMessage message={message} />
}
