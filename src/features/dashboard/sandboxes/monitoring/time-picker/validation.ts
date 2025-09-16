/**
 * Time picker form validation schema
 */

import { combineDateTimeStrings } from '@/lib/utils/formatting'
import { z } from 'zod'
import { CLOCK_SKEW_TOLERANCE, MAX_DAYS_AGO, MIN_RANGE_MS } from './constants'

export const customTimeFormSchema = z
  .object({
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    endEnabled: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // start date and time are required
    if (!data.startDate || !data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date and time are required',
        path: ['startDate'],
      })
      return
    }

    const startDateTime = combineDateTimeStrings(data.startDate, data.startTime)

    if (!startDateTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid start date/time',
        path: ['startDate'],
      })
      return
    }

    const now = Date.now()
    const startTimestamp = startDateTime.getTime()

    // validate start date is not more than 31 days ago
    if (startTimestamp < now - MAX_DAYS_AGO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be more than 31 days ago',
        path: ['startDate'],
      })
      return
    }

    // validate start date is not in the future (with tolerance for clock skew)
    if (startTimestamp > now + CLOCK_SKEW_TOLERANCE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be in the future',
        path: ['startDate'],
      })
      return
    }

    // if end is enabled, validate end time
    if (data.endEnabled && data.endDate && data.endTime) {
      const endDateTime = combineDateTimeStrings(data.endDate, data.endTime)

      if (!endDateTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end date/time',
          path: ['endDate'],
        })
        return
      }

      const endTimestamp = endDateTime.getTime()

      // Ensure end is after start
      if (endTimestamp <= startTimestamp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['endDate'],
        })
        return
      }

      // ensure minimum range
      if (endTimestamp - startTimestamp < MIN_RANGE_MS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Time range must be at least 1.5 minutes',
          path: ['endDate'],
        })
        return
      }

      // ensure end is not in the future (with tolerance)
      if (endTimestamp > now + CLOCK_SKEW_TOLERANCE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be in the future',
          path: ['endDate'],
        })
        return
      }

      // ensure range doesn't exceed maximum
      if (endTimestamp - startTimestamp > MAX_DAYS_AGO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Date range cannot exceed 31 days',
          path: ['endDate'],
        })
        return
      }
    }
  })

export type CustomTimeFormValues = z.infer<typeof customTimeFormSchema>
