import type { Timezone } from '@/features/dashboard/timezone'
import { formatTimezoneAbbreviation } from '@/lib/utils/formatting'

const BASE_ABBREVIATION_LENGTH = 3
const SIZE_PER_CHAR = 8

// baseSize fits a 3-char timezone abbreviation (e.g. "PDT"); longer labels
// like "GMT+12" grow the column instead of leaving dead space for short ones.
export const getTimestampColumnSize = (
  timezone: Timezone,
  baseSize: number
): number => {
  const abbreviationLength = formatTimezoneAbbreviation(
    new Date(),
    timezone
  ).length

  return (
    baseSize +
    Math.max(0, abbreviationLength - BASE_ABBREVIATION_LENGTH) * SIZE_PER_CHAR
  )
}
