import { z } from 'zod'

export interface TimeRangeValues {
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
}

export interface TimeRangePickerBounds {
  min?: Date
  max?: Date
}

type TimeRangeField = 'startDate' | 'endDate'

export interface TimeRangeIssue {
  field: TimeRangeField
  message: string
}

export interface TimeRangeValidationResult {
  startDateTime: Date | null
  endDateTime: Date | null
  issues: TimeRangeIssue[]
}

interface TimeRangeValidationOptions {
  hideTime: boolean
  bounds?: TimeRangePickerBounds
}

function normalizeDateInput(value: string): string {
  return value.trim().replaceAll(' ', '').replaceAll('-', '/')
}

function parseDateInput(value: string): Date | null {
  const normalized = normalizeDateInput(value)
  if (!normalized) {
    return null
  }

  const parts = normalized.split('/')
  if (parts.length !== 3) {
    return null
  }

  const [first, second, third] = parts
  if (!first || !second || !third) {
    return null
  }

  const firstValue = Number.parseInt(first, 10)
  const secondValue = Number.parseInt(second, 10)
  const thirdValue = Number.parseInt(third, 10)

  if (
    Number.isNaN(firstValue) ||
    Number.isNaN(secondValue) ||
    Number.isNaN(thirdValue)
  ) {
    return null
  }

  let year: number
  let month: number
  let day: number

  if (first.length === 4) {
    year = firstValue
    month = secondValue
    day = thirdValue
  } else if (third.length === 4) {
    day = firstValue
    month = secondValue
    year = thirdValue
  } else {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const parsed = new Date(year, month - 1, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

function parseTimeInput(value: string): {
  hours: number
  minutes: number
  seconds: number
} | null {
  const normalized = value.trim().replaceAll(' ', '')
  if (!normalized) {
    return null
  }

  const parts = normalized.split(':')
  if (parts.length === 2) {
    parts.push('0')
  }

  if (parts.length !== 3) {
    return null
  }

  const [hourPart, minutePart, secondPart] = parts
  if (!hourPart || !minutePart || !secondPart) {
    return null
  }

  const hours = Number.parseInt(hourPart, 10)
  const minutes = Number.parseInt(minutePart, 10)
  const seconds = Number.parseInt(secondPart, 10)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    return null
  }

  if (hours < 0 || hours > 23) {
    return null
  }

  if (minutes < 0 || minutes > 59) {
    return null
  }

  if (seconds < 0 || seconds > 59) {
    return null
  }

  return { hours, minutes, seconds }
}

export function toSecondPrecision(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000)
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

function formatTimeValue(hours: number, minutes: number, seconds: number): string {
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function parsePickerDateTime(
  dateInput: string,
  timeInput: string | null | undefined,
  fallbackTime: string
): Date | null {
  const parsedDate = parseDateInput(dateInput)
  if (!parsedDate) {
    return null
  }

  const effectiveTime =
    timeInput && timeInput.trim().length > 0 ? timeInput : fallbackTime
  const parsedTime = parseTimeInput(effectiveTime)
  if (!parsedTime) {
    return null
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
    parsedTime.seconds,
    0
  )
}

function formatBoundaryDateTime(date: Date, hideTime: boolean): string {
  if (hideTime) {
    return date.toLocaleDateString()
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function normalizeTimeValue(time: string | null): string | null {
  if (!time) {
    return null
  }

  const parsedTime = parseTimeInput(time)
  if (!parsedTime) {
    return time.trim()
  }

  return formatTimeValue(
    parsedTime.hours,
    parsedTime.minutes,
    parsedTime.seconds
  )
}

export function normalizeTimeRangeValues(values: TimeRangeValues): TimeRangeValues {
  const parsedStartDate = parseDateInput(values.startDate)
  const parsedEndDate = parseDateInput(values.endDate)

  return {
    startDate: parsedStartDate
      ? formatDateValue(parsedStartDate)
      : values.startDate.trim(),
    startTime: normalizeTimeValue(values.startTime),
    endDate: parsedEndDate ? formatDateValue(parsedEndDate) : values.endDate.trim(),
    endTime: normalizeTimeValue(values.endTime),
  }
}

export function parseTimeRangeValuesToTimestamps(
  values: TimeRangeValues
): { start: number; end: number } | null {
  const startDateTime = parsePickerDateTime(
    values.startDate,
    values.startTime,
    '00:00:00'
  )
  const endDateTime = parsePickerDateTime(
    values.endDate,
    values.endTime,
    '23:59:59'
  )

  if (!startDateTime || !endDateTime) {
    return null
  }

  return {
    start: startDateTime.getTime(),
    end: endDateTime.getTime(),
  }
}

export function validateTimeRangeValues(
  values: TimeRangeValues,
  { bounds, hideTime }: TimeRangeValidationOptions
): TimeRangeValidationResult {
  const issues: TimeRangeIssue[] = []

  const startDateTime = parsePickerDateTime(
    values.startDate,
    hideTime ? null : values.startTime,
    '00:00:00'
  )
  const endDateTime = parsePickerDateTime(
    values.endDate,
    hideTime ? null : values.endTime,
    '23:59:59'
  )

  if (!startDateTime) {
    issues.push({
      field: 'startDate',
      message: 'Invalid start date format',
    })
  }

  if (!endDateTime) {
    issues.push({
      field: 'endDate',
      message: 'Invalid end date format',
    })
  }

  if (!startDateTime || !endDateTime) {
    return {
      startDateTime,
      endDateTime,
      issues,
    }
  }

  const minBoundary = bounds?.min ? toSecondPrecision(bounds.min) : undefined
  const maxBoundary = bounds?.max ? toSecondPrecision(bounds.max) : undefined

  if (minBoundary && startDateTime.getTime() < minBoundary.getTime()) {
    issues.push({
      field: 'startDate',
      message: `Start date cannot be before ${formatBoundaryDateTime(minBoundary, hideTime)}`,
    })
  }

  if (maxBoundary && endDateTime.getTime() > maxBoundary.getTime()) {
    issues.push({
      field: 'endDate',
      message: `End date cannot be after ${formatBoundaryDateTime(maxBoundary, hideTime)}`,
    })
  }

  if (endDateTime.getTime() < startDateTime.getTime()) {
    issues.push({
      field: 'endDate',
      message: 'End date cannot be before start date',
    })
  }

  return {
    startDateTime,
    endDateTime,
    issues,
  }
}

export function createTimeRangeSchema(options: TimeRangeValidationOptions) {
  return z
    .object({
      startDate: z.string().min(1, 'Start date is required'),
      startTime: z.string().nullable(),
      endDate: z.string().min(1, 'End date is required'),
      endTime: z.string().nullable(),
    })
    .superRefine((data, ctx) => {
      const validation = validateTimeRangeValues(data, options)

      for (const issue of validation.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: [issue.field],
        })
      }
    })
}
