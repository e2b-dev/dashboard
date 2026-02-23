import { Badge, type BadgeProps } from '@/ui/primitives/badge'

export type LogLevelValue = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_BADGE_PROPS: Record<LogLevelValue, BadgeProps> = {
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

export const LOG_LEVEL_LEFT_BORDER_CLASS: Record<LogLevelValue, string> = {
  debug: '',
  info: 'border-accent-info-highlight!',
  warn: 'border-accent-warning-highlight!',
  error: 'border-accent-error-highlight!',
}

interface LogLevelBadgeProps {
  level: LogLevelValue
}

export function LogLevelBadge({ level }: LogLevelBadgeProps) {
  return (
    <Badge {...LOG_LEVEL_BADGE_PROPS[level]} className="uppercase h-[18px]">
      {level}
    </Badge>
  )
}

interface LogMessageProps {
  message: string
}

export function LogMessage({ message }: LogMessageProps) {
  return <span className="prose-body whitespace-nowrap">{message}</span>
}
