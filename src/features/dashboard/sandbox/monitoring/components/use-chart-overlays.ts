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
  estimateLifecycleEventLabelWidthPx,
} from '../utils/chart-overlay-layout'
import {
  SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX,
  SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX,
} from '../utils/constants'

interface UseChartOverlaysOptions {
  chartInstanceRef: RefObject<echarts.ECharts | null>
  chartRevision: number
  series: SandboxMetricsSeries[]
  lifecycleEventMarkers: SandboxMetricsLifecycleEventMarker[]
  hoveredTimestampMs: number | null
  showXAxisLabels: boolean
  showEventLabels: boolean
  computedYAxisMax: number
  cssVars: Record<string, string>
  stroke: string
  fg: string
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
  computedYAxisMax,
  cssVars,
  stroke,
  fg,
  yAxisFormatter,
}: UseChartOverlaysOptions): UseChartOverlaysResult {
  const crosshairMarkers = useMemo<CrosshairMarker[]>(() => {
    void chartRevision

    if (hoveredTimestampMs === null) {
      return []
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return []
    }

    const firstTimestamps = series
      .map((line) => findFirstValidPointTimestampMs(line.data))
      .filter((value): value is number => value !== null)
    const firstTimestampMs =
      firstTimestamps.length > 0 ? Math.min(...firstTimestamps) : null
    const firstPointPixel =
      firstTimestampMs !== null
        ? chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
            firstTimestampMs,
            0,
          ])
        : null
    const firstPointPx =
      Array.isArray(firstPointPixel) &&
      firstPointPixel.length > 0 &&
      typeof firstPointPixel[0] === 'number' &&
      Number.isFinite(firstPointPixel[0])
        ? firstPointPixel[0]
        : null

    const markers = series.flatMap((line) => {
      const closestPoint = findClosestValidPoint(line.data, hoveredTimestampMs)
      if (!closestPoint) {
        return []
      }

      const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
        closestPoint.timestampMs,
        closestPoint.value,
      ])
      if (!Array.isArray(pixel) || pixel.length < 2) {
        return []
      }

      const xPx = pixel[0]
      const yPx = pixel[1]
      if (
        typeof xPx !== 'number' ||
        typeof yPx !== 'number' ||
        !Number.isFinite(xPx) ||
        !Number.isFinite(yPx)
      ) {
        return []
      }

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

    const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
      hoveredTimestampMs,
      0,
    ])
    if (!Array.isArray(pixel) || pixel.length < 1) {
      return null
    }

    const xPx = pixel[0]
    if (typeof xPx !== 'number' || !Number.isFinite(xPx)) {
      return null
    }

    return {
      xPx,
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
      const topPixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
        event.timestampMs,
        computedYAxisMax,
      ])
      const bottomPixel = chart.convertToPixel(
        { xAxisIndex: 0, yAxisIndex: 0 },
        [event.timestampMs, 0]
      )
      if (
        !Array.isArray(topPixel) ||
        !Array.isArray(bottomPixel) ||
        topPixel.length < 2 ||
        bottomPixel.length < 2
      ) {
        return []
      }

      const xPx = topPixel[0]
      const topValuePx = topPixel[1]
      const bottomValuePx = bottomPixel[1]
      if (
        typeof xPx !== 'number' ||
        typeof topValuePx !== 'number' ||
        typeof bottomValuePx !== 'number' ||
        !Number.isFinite(xPx) ||
        !Number.isFinite(topValuePx) ||
        !Number.isFinite(bottomValuePx)
      ) {
        return []
      }

      const anchorTopPx = Math.min(topValuePx, bottomValuePx)
      const baseLabelTopPx = SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX
      const color = cssVars[event.colorVar] ?? fg
      const labelXPx = xPx

      if (!Number.isFinite(anchorTopPx)) {
        return []
      }

      return [
        {
          key: event.id,
          type: event.type,
          xPx,
          anchorTopPx,
          bottomPx: bottomValuePx,
          label: event.label,
          timestampMs: event.timestampMs,
          labelXPx,
          baseLabelTopPx,
          labelTopPx: baseLabelTopPx,
          estimatedLabelWidthPx: estimateLifecycleEventLabelWidthPx(),
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
