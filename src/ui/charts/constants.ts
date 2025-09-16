/**
 * Line chart constants and configuration
 */

// timing constants
export const LIVE_DATA_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes - data considered "live" if within this window
export const TIME_LABEL_HIDE_SECONDS_THRESHOLD_MS = 30 * 60 * 1000 // threshold for hiding seconds in time labels
export const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000 // 1 minute tolerance for future timestamps

// chart scaling and display
export const Y_AXIS_MAX_MULTIPLIER = 1.3 // multiply max value by this for y-axis ceiling
export const LIMIT_LINE_TOLERANCE = 0.1 // 10% tolerance for hiding elements near limit line
export const LIMIT_LINE_MIN_DISTANCE = 0.05 // minimum 5% distance from limit line

// live indicator configuration
export const LIVE_INDICATOR_SIZES = {
  outer: 16,
  middle: 10,
  inner: 6,
} as const

// symbol sizes
export const DEFAULT_SYMBOL_SIZE = 0
export const HOVER_SYMBOL_SIZE = 6
export const EMPHASIS_SYMBOL_SIZE = 8
export const EMPHASIS_SCALE = 1.5

// responsive breakpoint configurations
export const RESPONSIVE_CONFIG = {
  xs: {
    xAxisSplitNumber: 3,
    yAxisSplitNumber: 3,
    fontSize: 10,
    xAxisInterval: 2,
    yAxisWidth: 30,
  },
  sm: {
    xAxisSplitNumber: 4,
    yAxisSplitNumber: 5,
    fontSize: 10,
    xAxisInterval: 1,
    yAxisWidth: 30,
  },
  md: {
    xAxisSplitNumber: 5,
    yAxisSplitNumber: 5,
    fontSize: 12,
    xAxisInterval: 'auto' as const,
    yAxisWidth: 40,
  },
  lg: {
    xAxisSplitNumber: 8,
    yAxisSplitNumber: 6,
    fontSize: 12,
    xAxisInterval: 0,
    yAxisWidth: 40,
  },
} as const

// animation and transition
export const TOOLTIP_TRANSITION_DURATION = 0.2
export const DEFAULT_LINE_WIDTH = 1
export const LIMIT_LINE_WIDTH = 2

// chart area styling
export const AREA_STYLE_OPACITY = 0.08
export const LIVE_INDICATOR_OUTER_OPACITY = 0.4
export const LIVE_INDICATOR_MIDDLE_OPACITY = 0.3
export const LIMIT_LINE_OPACITY = 0.8

// z-index layers
export const LIMIT_LINE_Z_INDEX = 10
