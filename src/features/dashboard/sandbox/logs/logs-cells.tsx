import { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge, BadgeProps } from '@/ui/primitives/badge'

interface LogLevelProps {
  level: SandboxLogDTO['level']
}

const mapLogLevelToBadgeProps: Record<SandboxLogDTO['level'], BadgeProps> = {
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
}

export const Timestamp = ({ timestampUnix }: TimestampProps) => {
  const date = new Date(timestampUnix)

  const centiseconds = Math.floor((date.getMilliseconds() / 10) % 100)
    .toString()
    .padStart(2, '0')
  const localDatePart = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
  }).format(date)
  const localTimePart = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

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
