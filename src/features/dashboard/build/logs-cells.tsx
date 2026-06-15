import type { BuildLogModel } from '@/core/modules/builds/models'
import {
  LogLevelBadge,
  LogMessage,
} from '@/features/dashboard/common/log-cells'
import { useTimezone } from '@/features/dashboard/timezone'
import { formatDate, formatDurationCompact } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'

export const LogLevel = ({ level }: { level: BuildLogModel['level'] }) => {
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
  const { timezone } = useTimezone()
  const date = new Date(timestampUnix)

  return (
    <CopyButtonInline
      value={date.toISOString()}
      truncate={false}
      className="font-mono group prose-table-numeric"
    >
      <span className="inline-block w-[7ch] shrink-0 text-right">
        {formatDurationCompact(millisAfterStart, true)}
      </span>
      <span className="ml-2 whitespace-nowrap group-hover:text-current transition-colors text-fg-tertiary">
        {formatDate(timestampUnix, {
          timezone,
          format: 'time-with-centiseconds',
        })}
      </span>
    </CopyButtonInline>
  )
}

interface MessageProps {
  message: BuildLogModel['message']
}

export const Message = ({ message }: MessageProps) => {
  return <LogMessage message={message} />
}
