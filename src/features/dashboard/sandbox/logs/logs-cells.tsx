import type { SandboxLogModel } from '@/core/modules/sandboxes/models'
import { LogLevelBadge } from '@/features/dashboard/common/log-cells'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'

export const LogLevel = ({ level }: { level: SandboxLogModel['level'] }) => {
  return <LogLevelBadge level={level} />
}

interface TimestampProps {
  timestampUnix: number
}

export const Timestamp = ({ timestampUnix }: TimestampProps) => {
  const formatted = formatLocalLogStyleTimestamp(timestampUnix, {
    includeCentiseconds: true,
  })

  if (!formatted) {
    return <span className="font-mono prose-table-numeric">--</span>
  }

  return (
    <CopyButtonInline
      value={formatted.iso}
      className="font-mono group prose-table-numeric truncate"
    >
      <span className="text-fg-tertiary">{formatted.datePart}</span>{' '}
      {formatted.timePart}.{formatted.subsecondPart}
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
