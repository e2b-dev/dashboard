import {
  LogLevelBadge,
  LogMessage,
} from '@/features/dashboard/common/log-cells'
import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import CopyButtonInline from '@/ui/copy-button-inline'

const LOCAL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: '2-digit',
})

const LOCAL_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export const LogLevel = ({ level }: { level: SandboxLogDTO['level'] }) => {
  return <LogLevelBadge level={level} />
}

interface TimestampProps {
  timestampUnix: number
}

export const Timestamp = ({ timestampUnix }: TimestampProps) => {
  const date = new Date(timestampUnix)

  const centiseconds = Math.floor((date.getMilliseconds() / 10) % 100)
    .toString()
    .padStart(2, '0')
  const localDatePart = LOCAL_DATE_FORMATTER.format(date)
  const localTimePart = LOCAL_TIME_FORMATTER.format(date)

  return (
    <CopyButtonInline
      value={date.toISOString()}
      className="font-mono group prose-table-numeric truncate"
    >
      <span className="text-fg-tertiary">{localDatePart}</span> {localTimePart}.
      {centiseconds}
    </CopyButtonInline>
  )
}

interface MessageProps {
  message: SandboxLogDTO['message']
}

export const Message = ({ message }: MessageProps) => {
  return <LogMessage message={message} />
}
