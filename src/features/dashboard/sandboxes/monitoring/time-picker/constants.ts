/**
 * Time picker constants and configuration
 */

import { formatDuration } from '@/lib/utils/formatting'

export interface TimeOption {
  label: string
  value: string
  shortcut: string
  rangeMs: number
}

// predefined time range options
export const TIME_OPTIONS: TimeOption[] = [
  {
    label: `Last ${formatDuration(60 * 1000)}`,
    value: '1m',
    shortcut: '1M',
    rangeMs: 60 * 1000,
  },
  {
    label: `Last ${formatDuration(5 * 60 * 1000)}`,
    value: '5m',
    shortcut: '5M',
    rangeMs: 5 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(30 * 60 * 1000)}`,
    value: '30m',
    shortcut: '30M',
    rangeMs: 30 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(60 * 60 * 1000)}`,
    value: '1h',
    shortcut: '1H',
    rangeMs: 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(3 * 60 * 60 * 1000)}`,
    value: '3h',
    shortcut: '3H',
    rangeMs: 3 * 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(6 * 60 * 60 * 1000)}`,
    value: '6h',
    shortcut: '6H',
    rangeMs: 6 * 60 * 60 * 1000,
  },
  {
    label: `Last 7 days`,
    value: '7d',
    shortcut: '7d',
    rangeMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    label: `Last 14 days`,
    value: '14d',
    shortcut: '14D',
    rangeMs: 14 * 24 * 60 * 60 * 1000,
  },
  {
    label: `Last 30 days`,
    value: '30d',
    shortcut: '30D',
    rangeMs: 30 * 24 * 60 * 60 * 1000,
  },
]

// constraints
export const MAX_DAYS_AGO = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
export const MIN_RANGE_MS = 1.5 * 60 * 1000 // 1.5 minutes minimum
export const CLOCK_SKEW_TOLERANCE = 60 * 1000 // 60 seconds
export const DEFAULT_RANGE_MS = 60 * 60 * 1000 // 1 hour default

// panel dimensions for positioning
export const CUSTOM_PANEL_WIDTH = 340
export const CUSTOM_PANEL_HEIGHT = 280
