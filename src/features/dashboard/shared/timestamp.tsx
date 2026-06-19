import { formatDisplayTimestamp } from '@/lib/utils/formatting'

type TimestampProps = {
  value: string
}

export const Timestamp = ({ value }: TimestampProps) => {
  return <p>{formatDisplayTimestamp(value)}</p>
}
