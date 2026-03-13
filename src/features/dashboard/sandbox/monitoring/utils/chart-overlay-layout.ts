import type { ReactNode } from 'react'
import { SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX } from './constants'

const MARKER_OVERLAP_THRESHOLD_PX = 24
const MARKER_LABEL_VERTICAL_GAP_PX = 20
const EVENT_ICON_SIZE = 12
const EVENT_LABEL_OVERLAP_GAP_PX = 6
const EVENT_LABEL_STAGGER_STEP_PX = 30

export interface CrosshairMarker {
  key: string
  xPx: number
  yPx: number
  valueContent: ReactNode
  dotColor: string
  placeValueOnRight: boolean
  labelOffsetYPx: number
}

export interface LifecycleEventOverlay {
  key: string
  type: string
  xPx: number
  topPx: number
  heightPx: number
  label: string
  timestampMs: number
  labelXPx: number
  labelTopPx: number
  color: string
  alignRight: boolean
}

export interface LifecycleEventOverlayLayout {
  key: string
  type: string
  xPx: number
  anchorTopPx: number
  bottomPx: number
  label: string
  timestampMs: number
  labelXPx: number
  baseLabelTopPx: number
  labelTopPx: number
  estimatedLabelWidthPx: number
  color: string
  alignRight: boolean
}

export function applyMarkerLabelOffsets(
  markers: CrosshairMarker[]
): CrosshairMarker[] {
  if (markers.length < 2) {
    return markers
  }

  const sortedMarkers = [...markers].sort((a, b) => a.yPx - b.yPx)
  const offsetsByMarkerKey = new Map<string, number>()
  let clusterStart = 0

  for (let index = 1; index <= sortedMarkers.length; index += 1) {
    const previousMarker = sortedMarkers[index - 1]
    const currentMarker = sortedMarkers[index]
    if (!previousMarker) {
      continue
    }

    const shouldSplitCluster =
      !currentMarker ||
      Math.abs(currentMarker.yPx - previousMarker.yPx) >
        MARKER_OVERLAP_THRESHOLD_PX

    if (!shouldSplitCluster) {
      continue
    }

    const cluster = sortedMarkers.slice(clusterStart, index)
    const halfIndex = (cluster.length - 1) / 2

    cluster.forEach((marker, clusterIndex) => {
      const offset = (clusterIndex - halfIndex) * MARKER_LABEL_VERTICAL_GAP_PX
      offsetsByMarkerKey.set(marker.key, offset)
    })

    clusterStart = index
  }

  return markers.map((marker) => ({
    ...marker,
    labelOffsetYPx: offsetsByMarkerKey.get(marker.key) ?? marker.labelOffsetYPx,
  }))
}

// Collapsed state is icon-only: icon size + padding (p-1 = 4px each side) + border (1px each side)
export const LIFECYCLE_EVENT_LABEL_WIDTH_PX = EVENT_ICON_SIZE + 8 + 2

function doLifecycleEventLabelsOverlap(
  left: LifecycleEventOverlayLayout,
  right: LifecycleEventOverlayLayout
): boolean {
  const minDistance =
    (left.estimatedLabelWidthPx + right.estimatedLabelWidthPx) / 2 +
    EVENT_LABEL_OVERLAP_GAP_PX

  return right.labelXPx - left.labelXPx < minDistance
}

export function applyLifecycleEventLabelOffsets(
  overlays: LifecycleEventOverlayLayout[]
): LifecycleEventOverlayLayout[] {
  if (overlays.length < 2) {
    return overlays
  }

  const sortedOverlays = [...overlays].sort((a, b) => a.labelXPx - b.labelXPx)
  const labelTopByOverlayKey = new Map<string, number>()
  let clusterStart = 0

  for (let index = 1; index <= sortedOverlays.length; index += 1) {
    const previousOverlay = sortedOverlays[index - 1]
    const currentOverlay = sortedOverlays[index]
    if (!previousOverlay) {
      continue
    }

    const shouldSplitCluster =
      !currentOverlay ||
      !doLifecycleEventLabelsOverlap(previousOverlay, currentOverlay)

    if (!shouldSplitCluster) {
      continue
    }

    const cluster = sortedOverlays.slice(clusterStart, index)
    cluster.forEach((overlay, clusterIndex) => {
      const verticalOffsetPx = -clusterIndex * EVENT_LABEL_STAGGER_STEP_PX
      const nextLabelTopPx = Math.max(
        SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX,
        overlay.baseLabelTopPx + verticalOffsetPx
      )

      labelTopByOverlayKey.set(overlay.key, nextLabelTopPx)
    })

    clusterStart = index
  }

  return overlays.map((overlay) => ({
    ...overlay,
    labelTopPx: labelTopByOverlayKey.get(overlay.key) ?? overlay.labelTopPx,
  }))
}
