'use client'

import { useTimezone } from '@/features/dashboard/timezone'
import { formatDate, getRelativeDay } from '@/lib/utils/formatting'

type TimestampProps = {
  value: string
}

export const Timestamp = ({ value }: TimestampProps) => {
  const { timezone } = useTimezone()
  const relativeDay = getRelativeDay(value, timezone)
  const time = formatDate(value, { timezone, format: 'time' })

  return <p>{time ? `${relativeDay}, ${time}` : '--'}</p>
}
