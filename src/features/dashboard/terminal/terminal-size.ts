import { DEFAULT_COLS, DEFAULT_PANEL_HEIGHT, DEFAULT_ROWS } from './constants'

const MIN_TERMINAL_COLS = 40
const MIN_TERMINAL_ROWS = 8
const TERMINAL_PADDING_PX = 24
const TERMINAL_SCROLLBAR_GUTTER_PX = 44
const DEFAULT_CELL_WIDTH_PX = 8
const DEFAULT_CELL_HEIGHT_PX = 20

type TerminalLike = {
  cols: number
  rows: number
}

export function calculateTerminalSize(
  container: HTMLDivElement | null,
  terminal: TerminalLike | null
) {
  if (terminal) {
    return {
      cols: terminal.cols,
      rows: terminal.rows,
    }
  }

  if (!container) {
    return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS }
  }

  const containerRect = container.getBoundingClientRect()
  const containerWidth =
    container.clientWidth || containerRect.width || window.innerWidth
  const containerHeight =
    container.clientHeight || containerRect.height || DEFAULT_PANEL_HEIGHT
  const availableWidth =
    containerWidth - TERMINAL_PADDING_PX - TERMINAL_SCROLLBAR_GUTTER_PX
  const availableHeight = containerHeight - TERMINAL_PADDING_PX

  return {
    cols: Math.max(
      MIN_TERMINAL_COLS,
      Math.floor(availableWidth / DEFAULT_CELL_WIDTH_PX)
    ),
    rows: Math.max(
      MIN_TERMINAL_ROWS,
      Math.floor(availableHeight / DEFAULT_CELL_HEIGHT_PX) - 1
    ),
  }
}
