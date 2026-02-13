import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge, type BadgeProps } from '@/ui/primitives/badge'

interface LogLevelProps {
  level: SandboxLogDTO['level']
}

const LOG_LEVEL_BADGE_PROPS: Record<SandboxLogDTO['level'], BadgeProps> = {
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

export const LogLevel = ({ level }: LogLevelProps) => {
  return (
    <Badge {...LOG_LEVEL_BADGE_PROPS[level]} className="uppercase h-[18px]">
      {level}
    </Badge>
  )
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
  return <span className="prose-body whitespace-nowrap">{message}</span>
}
