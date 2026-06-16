import type { AgentTemplateConfig } from '@/configs/agents'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import { useSandboxListTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import {
  LOCAL_INFRA_HOSTNAMES,
  TERMINAL_WINDOW_MAX_CASCADE_STEPS,
  TERMINAL_WINDOW_MIN_HEIGHT_PX,
  TERMINAL_WINDOW_MIN_WIDTH_PX,
  TERMINAL_WINDOW_OFFSET_PX,
} from './constants'
import type { WindowPosition, WindowSize } from './types'

export const sortByNewestStartedAt = (a: Sandbox, b: Sandbox) => {
  const aTime = new Date(a.startedAt).getTime()
  const bTime = new Date(b.startedAt).getTime()

  return bTime - aTime
}

export const formatStartedAt = (startedAt: string) => {
  const formatted = formatLocalLogStyleTimestamp(startedAt, {
    includeSeconds: false,
  })

  if (!formatted) {
    return '--'
  }

  return `${formatted.datePart} ${formatted.timePart} ${formatted.timezonePart}`
}

export const getStateBadgeVariant = (state: Sandbox['state']) => {
  if (state === 'running') return 'positive'
  if (state === 'paused') return 'warning'
  if (state === 'killed') return 'default'

  return 'info'
}

export const applySandboxHistoryFilter = (template: AgentTemplateConfig) => {
  const tableStore = useSandboxListTableStore.getState()

  tableStore.resetFilters()
  tableStore.setTemplateFilters([template.template])
}

export const canReopenTerminal = (sandbox: Sandbox) =>
  sandbox.state === 'running' || sandbox.state === 'paused'

export const canPauseSandboxes = () => {
  const infraApiUrl = process.env.NEXT_PUBLIC_INFRA_API_URL

  if (!infraApiUrl) {
    return true
  }

  try {
    const url = new URL(infraApiUrl)

    return !(LOCAL_INFRA_HOSTNAMES.has(url.hostname) && url.port === '3001')
  } catch {
    return true
  }
}

export const getInitialWindowPosition = (
  windowCount: number
): WindowPosition => {
  const offset =
    Math.min(windowCount, TERMINAL_WINDOW_MAX_CASCADE_STEPS) *
    TERMINAL_WINDOW_OFFSET_PX

  return { x: offset, y: offset }
}

export const clampWindowPosition = ({
  layerRect,
  position,
  windowRect,
}: {
  layerRect: DOMRect
  position: WindowPosition
  windowRect: DOMRect
}): WindowPosition => ({
  x: Math.max(0, Math.min(position.x, layerRect.width - windowRect.width)),
  y: Math.max(0, Math.min(position.y, layerRect.height - windowRect.height)),
})

export const clampWindowSize = ({
  layerRect,
  position,
  size,
}: {
  layerRect: DOMRect
  position: WindowPosition
  size: WindowSize
}): WindowSize => ({
  height: Math.max(
    TERMINAL_WINDOW_MIN_HEIGHT_PX,
    Math.min(size.height, layerRect.height - position.y)
  ),
  width: Math.max(
    TERMINAL_WINDOW_MIN_WIDTH_PX,
    Math.min(size.width, layerRect.width - position.x)
  ),
})
