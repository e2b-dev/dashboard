import { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Badge, BadgeProps } from '@/ui/primitives/badge'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'

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

  // format: "Feb 13 09:39:01.17"
  const centiseconds = Math.floor((date.getMilliseconds() / 10) % 100)
    .toString()
    .padStart(2, '0')

  return (
    <CopyButtonInline
      value={date.toISOString()}
      className="font-mono group prose-table-numeric truncate"
    >
      {format(date, 'MMM dd HH:mm:ss', { locale: enUS })}.{centiseconds}
    </CopyButtonInline>
  )
}

interface MessageProps {
  message: SandboxLogDTO['message']
}

export const Message = ({ message }: MessageProps) => {
  return <span className="prose-body whitespace-nowrap">{message}</span>
}
