'use client'

import CopyButton from '@/ui/copy-button'

type TimestampProps = {
  value: string
}

export const Timestamp = ({ value }: TimestampProps) => {
  const date = new Date(value)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const prefix = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : date.toLocaleDateString()
  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex items-center gap-1">
      <p>
        {prefix}, {timeStr}
      </p>
      <CopyButton value={value} />
    </div>
  )
}
