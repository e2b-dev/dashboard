import type { SandboxLogModel } from '@/core/domains/sandboxes/models'
import { LogLevelBadge } from '@/features/dashboard/common/log-cells'
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

export const LogLevel = ({ level }: { level: SandboxLogModel['level'] }) => {
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
  message: SandboxLogModel['message']
  search: string
  shouldHighlight: boolean
}

function getMessageSegments(message: string, search: string) {
  if (!search) {
    return [{ text: message, isMatch: false }]
  }

  const segments: Array<{ text: string; isMatch: boolean }> = []
  let startIndex = 0

  while (startIndex < message.length) {
    const matchIndex = message.indexOf(search, startIndex)
    if (matchIndex === -1) {
      segments.push({ text: message.slice(startIndex), isMatch: false })
      break
    }

    if (matchIndex > startIndex) {
      segments.push({
        text: message.slice(startIndex, matchIndex),
        isMatch: false,
      })
    }

    segments.push({
      text: message.slice(matchIndex, matchIndex + search.length),
      isMatch: true,
    })
    startIndex = matchIndex + search.length
  }

  return segments
}

export const Message = ({ message, search, shouldHighlight }: MessageProps) => {
  const segments = shouldHighlight
    ? getMessageSegments(message, search)
    : [{ text: message, isMatch: false }]

  return (
    <span className="prose-body whitespace-nowrap">
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark
            key={`${index}-${segment.text}`}
            className="bg-accent-main-highlight/15 py-px! ring-[1px] ring-accent-main-highlight/30 text-current"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        )
      )}
    </span>
  )
}
