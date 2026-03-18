import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import type { BuildLogModel } from '@/core/domains/builds/models'
import {
  LogLevelBadge,
  LogMessage,
} from '@/features/dashboard/common/log-cells'
import { formatDurationCompact } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge, type BadgeProps } from '@/ui/primitives/badge'

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
  message: BuildLogModel['message']
}

export const Message = ({ message }: MessageProps) => {
  return <LogMessage message={message} />
}
