import type * as echarts from 'echarts/core'
import { type RefObject, useMemo } from 'react'
import type {
  SandboxMetricsLifecycleEventMarker,
  SandboxMetricsSeries,
} from '../types/sandbox-metrics-chart'
import {
  findClosestValidPoint,
  findFirstValidPointTimestampMs,
  formatXAxisLabel,
} from '../utils/chart-data-utils'
import type {
  CrosshairMarker,
  LifecycleEventOverlay,
  LifecycleEventOverlayLayout,
} from '../utils/chart-overlay-layout'
import {
  applyLifecycleEventLabelOffsets,
  applyMarkerLabelOffsets,
  LIFECYCLE_EVENT_LABEL_WIDTH_PX,
} from '../utils/chart-overlay-layout'
import {
  SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_MOBILE_PX,
  SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX,
  SANDBOX_MONITORING_CHART_FALLBACK_STROKE,
  SANDBOX_MONITORING_CHART_FG_VAR,
  SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX,
  SANDBOX_MONITORING_CHART_STROKE_VAR,
} from '../utils/constants'

const ECHARTS_COORD_INDEX = { xAxisIndex: 0, yAxisIndex: 0 }

function safeConvertToPixel(
  chart: echarts.ECharts,
  coords: [number, number]
): [number, number] | null {
  const pixel = chart.convertToPixel(ECHARTS_COORD_INDEX, coords)
  if (!Array.isArray(pixel) || pixel.length < 2) {
    return null
  }

  const x = pixel[0]
  const y = pixel[1]
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null
  }

  return [x, y]
}

interface UseChartOverlaysOptions {
  chartInstanceRef: RefObject<echarts.ECharts | null>
  chartRevision: number
  series: SandboxMetricsSeries[]
  lifecycleEventMarkers: SandboxMetricsLifecycleEventMarker[]
  hoveredTimestampMs: number | null
  showXAxisLabels: boolean
  isMobile: boolean
  computedYAxisMax: number
  cssVars: Record<string, string>
  yAxisFormatter: (value: number) => string
}

interface UseChartOverlaysResult {
  crosshairMarkers: CrosshairMarker[]
  xAxisHoverBadge: { xPx: number; label: string } | null
  lifecycleEventOverlays: LifecycleEventOverlay[]
}

export function useChartOverlays({
  chartInstanceRef,
  chartRevision,
  series,
  lifecycleEventMarkers,
  hoveredTimestampMs,
  showXAxisLabels,
  isMobile,
  computedYAxisMax,
  cssVars,
  yAxisFormatter,
}: UseChartOverlaysOptions): UseChartOverlaysResult {
  'use no memo'

  const stroke =
    cssVars[SANDBOX_MONITORING_CHART_STROKE_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_STROKE
  const fg = cssVars[SANDBOX_MONITORING_CHART_FG_VAR] || stroke

  const firstPointPx = useMemo(() => {
    void chartRevision

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return null
    }

    const firstTimestamps = series
      .map((line) => findFirstValidPointTimestampMs(line.data))
      .filter((value): value is number => value !== null)
    const firstTimestampMs =
      firstTimestamps.length > 0 ? Math.min(...firstTimestamps) : null

    if (firstTimestampMs === null) {
      return null
    }

    const pixel = safeConvertToPixel(chart, [firstTimestampMs, 0])
    return pixel ? pixel[0] : null
  }, [chartRevision, series])

  const crosshairMarkers = useMemo<CrosshairMarker[]>(() => {
    void chartRevision

    if (hoveredTimestampMs === null) {
      return []
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return []
    }

    const markers = series.flatMap((line) => {
      const closestPoint = findClosestValidPoint(line.data, hoveredTimestampMs)
      if (!closestPoint) {
        return []
      }

      const pixel = safeConvertToPixel(chart, [
        closestPoint.timestampMs,
        closestPoint.value,
      ])
      if (!pixel) {
        return []
      }

      const [xPx, yPx] = pixel

      return [
        {
          key: `${line.id}-${closestPoint.timestampMs}`,
          xPx,
          yPx,
          valueContent: line.markerValueFormatter
            ? line.markerValueFormatter({
                value: closestPoint.value,
                markerValue: closestPoint.markerValue,
              })
            : yAxisFormatter(closestPoint.value),
          dotColor: line.lineColorVar
            ? (cssVars[line.lineColorVar] ?? stroke)
            : stroke,
          placeValueOnRight:
            firstPointPx !== null &&
            xPx - firstPointPx <=
              SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX,
          labelOffsetYPx: 0,
        },
      ]
    })

    return applyMarkerLabelOffsets(markers)
  }, [
    chartRevision,
    cssVars,
    firstPointPx,
    hoveredTimestampMs,
    series,
    stroke,
    yAxisFormatter,
  ])

  const xAxisHoverBadge = useMemo(() => {
    void chartRevision

    if (!showXAxisLabels || hoveredTimestampMs === null) {
      return null
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return null
    }

    const pixel = safeConvertToPixel(chart, [hoveredTimestampMs, 0])
    if (!pixel) {
      return null
    }

    return {
      xPx: pixel[0],
      label: formatXAxisLabel(hoveredTimestampMs, true),
    }
  }, [chartRevision, hoveredTimestampMs, showXAxisLabels])

  const lifecycleEventOverlays = useMemo<LifecycleEventOverlay[]>(() => {
    void chartRevision

    if (lifecycleEventMarkers.length === 0) {
      return []
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return []
    }

    const chartWidth = chart.getWidth()
    const midpointPx = chartWidth / 2

    const baseOverlays = lifecycleEventMarkers.flatMap((event) => {
      const topPixel = safeConvertToPixel(chart, [
        event.timestampMs,
        computedYAxisMax,
      ])
      const bottomPixel = safeConvertToPixel(chart, [event.timestampMs, 0])
      if (!topPixel || !bottomPixel) {
        return []
      }

      const xPx = topPixel[0]
      const anchorTopPx = Math.min(topPixel[1], bottomPixel[1])
      const baseLabelTopPx = isMobile
        ? SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_MOBILE_PX
        : SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX
      const color = cssVars[event.colorVar] ?? fg

      if (!Number.isFinite(anchorTopPx)) {
        return []
      }

      return [
        {
          key: event.id,
          type: event.type,
          xPx,
          anchorTopPx,
          bottomPx: bottomPixel[1],
          label: event.label,
          timestampMs: event.timestampMs,
          labelXPx: xPx,
          baseLabelTopPx,
          labelTopPx: baseLabelTopPx,
          estimatedLabelWidthPx: LIFECYCLE_EVENT_LABEL_WIDTH_PX,
          color,
          alignRight: xPx > midpointPx,
        } satisfies LifecycleEventOverlayLayout,
      ]
    })

    return applyLifecycleEventLabelOffsets(baseOverlays).flatMap((overlay) => {
      const lineTopPx = overlay.anchorTopPx
      const heightPx = Math.max(Math.abs(overlay.bottomPx - lineTopPx), 0)

      if (!Number.isFinite(lineTopPx) || heightPx <= 0) {
        return []
      }

      return [
        {
          key: overlay.key,
          type: overlay.type,
          xPx: overlay.xPx,
          topPx: lineTopPx,
          heightPx,
          label: overlay.label,
          timestampMs: overlay.timestampMs,
          labelXPx: overlay.labelXPx,
          labelTopPx: overlay.labelTopPx,
          color: overlay.color,
          alignRight: overlay.alignRight,
        } satisfies LifecycleEventOverlay,
      ]
    })
  }, [chartRevision, computedYAxisMax, cssVars, fg, lifecycleEventMarkers])

  return {
    crosshairMarkers,
    xAxisHoverBadge,
    lifecycleEventOverlays,
  }
}
