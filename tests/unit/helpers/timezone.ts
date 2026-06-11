import { parseTimezone, type Timezone } from '@/features/dashboard/timezone'

const requireTimezone = (value: string): Timezone => {
  const timezone = parseTimezone(value)
  if (!timezone) throw new Error(`Expected ${value} to be a valid timezone`)

  return timezone
}

export { requireTimezone }
