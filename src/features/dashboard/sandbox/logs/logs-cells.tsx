'use client'

import type { SandboxLogModel } from '@/core/modules/sandboxes/models'
import { LogLevelBadge } from '@/features/dashboard/common/log-cells'
import { formatDateParts, useTimezone } from '@/features/dashboard/timezone'
import CopyButtonInline from '@/ui/copy-button-inline'

export const LogLevel = ({ level }: { level: SandboxLogModel['level'] }) => {
  return <LogLevelBadge level={level} />
}

interface TimestampProps {
  timestampUnix: number
}

export const Timestamp = ({ timestampUnix }: TimestampProps) => {
  const { timezone } = useTimezone()
  const formattedTimestamp = formatDateParts(timestampUnix, {
    timezone,
    format: 'date-time-with-centiseconds',
  })

  if (!formattedTimestamp) {
    return (
      <CopyButtonInline
        value=""
        className="font-mono group prose-table-numeric truncate"
      >
        --
      </CopyButtonInline>
    )
  }

  return (
    <CopyButtonInline
      value={formattedTimestamp.iso}
      className="font-mono group prose-table-numeric truncate"
    >
      <span className="text-fg-tertiary">{formattedTimestamp.datePart}</span>{' '}
      {formattedTimestamp.timePart}.{formattedTimestamp.subsecondPart}
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
