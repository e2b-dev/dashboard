import { z } from 'zod'
import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'

// PRIVATE

const _startDateSchema = z
  .number()
  .int()
  .positive()
  .describe('Unix timestamp in milliseconds')
  .refine(
    (start) => {
      const now = Date.now()

      return start >= now - MAX_DAYS_AGO
    },
    {
      message: `Start date cannot be more than ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days ago`,
    }
  )

const _endDateSchema = z
  .number()
  .int()
  .positive()
  .describe('Unix timestamp in milliseconds')
  .refine((end) => end <= Date.now(), {
    message: 'End date cannot be in the future',
  })

const _dateRangeRefine = (data: { startDate: number; endDate: number }) => {
  return data.endDate - data.startDate <= MAX_DAYS_AGO
}

const _dateRangeRefineMessage = {
  message: `Date range cannot exceed ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days`,
}

// PUBLIC

export const GetTeamMetricsSchema = z
  .object({
    startDate: _startDateSchema,
    endDate: _endDateSchema,
  })
  .refine(_dateRangeRefine, _dateRangeRefineMessage)

export const GetTeamMetricsMaxSchema = z
  .object({
    startDate: _startDateSchema,
    endDate: _endDateSchema,
    metric: z.enum(['concurrent_sandboxes', 'sandbox_start_rate']),
  })
  .refine(_dateRangeRefine, _dateRangeRefineMessage)
