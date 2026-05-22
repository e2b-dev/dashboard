import type { Terminal as XTerm } from '@xterm/xterm'
import { DEFAULT_COLS, DEFAULT_PANEL_HEIGHT, DEFAULT_ROWS } from './constants'

const MIN_TERMINAL_COLS = 40
const MIN_TERMINAL_ROWS = 8
const TERMINAL_PADDING_PX = 24
const TERMINAL_SCROLLBAR_GUTTER_PX = 44
const DEFAULT_CELL_WIDTH_PX = 8
const DEFAULT_CELL_HEIGHT_PX = 20
const MIN_CELL_WIDTH_PX = 4
const MAX_CELL_WIDTH_PX = 16
const MIN_CELL_HEIGHT_PX = 8
const MAX_CELL_HEIGHT_PX = 40

function getElementSize(element: Element | null) {
  if (!element) return undefined

  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return undefined

  return rect
}

function getMeasuredCellSize(terminal: XTerm | null) {
  const measureElement = terminal?.element?.querySelector(
    '.xterm-char-measure-element'
  )
  const rowElement = terminal?.element?.querySelector('.xterm-rows > div')
  const measuredCharSize = getElementSize(measureElement ?? null)
  const rowSize = getElementSize(rowElement ?? null)

  if (!measuredCharSize && !rowSize) return undefined

  const measuredWidth = measuredCharSize?.width
  const measuredHeight = rowSize?.height ?? measuredCharSize?.height

  return {
    width:
      measuredWidth &&
      measuredWidth >= MIN_CELL_WIDTH_PX &&
      measuredWidth <= MAX_CELL_WIDTH_PX
        ? measuredWidth
        : undefined,
    height:
      measuredHeight &&
      measuredHeight >= MIN_CELL_HEIGHT_PX &&
      measuredHeight <= MAX_CELL_HEIGHT_PX
        ? measuredHeight
        : undefined,
  }
}

export function calculateTerminalSize(
  container: HTMLDivElement | null,
  terminal: XTerm | null
) {
  if (!container) {
    return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS }
  }

  const measuredCellSize = getMeasuredCellSize(terminal)
  const containerRect = container.getBoundingClientRect()
  const containerWidth =
    container.clientWidth || containerRect.width || window.innerWidth
  const containerHeight =
    container.clientHeight || containerRect.height || DEFAULT_PANEL_HEIGHT
  const availableWidth =
    containerWidth - TERMINAL_PADDING_PX - TERMINAL_SCROLLBAR_GUTTER_PX
  const availableHeight = containerHeight - TERMINAL_PADDING_PX
  const cellWidth = Math.max(
    measuredCellSize?.width ?? DEFAULT_CELL_WIDTH_PX,
    1
  )
  const cellHeight = Math.max(
    measuredCellSize?.height ?? DEFAULT_CELL_HEIGHT_PX,
    1
  )

  return {
    cols: Math.max(MIN_TERMINAL_COLS, Math.floor(availableWidth / cellWidth)),
    rows: Math.max(
      MIN_TERMINAL_ROWS,
      Math.floor(availableHeight / cellHeight) - 1
    ),
  }
}
