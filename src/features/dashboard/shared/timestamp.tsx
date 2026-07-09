'use client'

import { useTimezone } from '@/features/dashboard/timezone'
import {
  formatDate,
  formatTimezoneAbbreviation,
  getRelativeDay,
} from '@/lib/utils/formatting'

type TimestampProps = {
  value: string
}

export const Timestamp = ({ value }: TimestampProps) => {
  const { timezone } = useTimezone()

  const relativeDay = getRelativeDay(value, timezone)
  const timeStr = formatDate(value, { timezone, format: 'time' })
  const tzAbbreviation = formatTimezoneAbbreviation(value, timezone)

  return (
    <p>
      {relativeDay}, {timeStr} {tzAbbreviation}
    </p>
  )
}
