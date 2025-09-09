'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { formatAveragingPeriod, formatDecimal } from '@/lib/utils/formatting'
import { ParsedTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import LineChart from '@/ui/data/line-chart'
import { ReactiveLiveBadge } from '@/ui/live'
import * as echarts from 'echarts'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useEffect, useMemo, useRef } from 'react'
import { NonUndefined } from 'react-hook-form'
import {
  calculateAverage,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  createSingleValueTooltipFormatter,
  fillMetricsWithZeros,
  transformMetricsToLineData,
} from './chart-utils'
import { useSyncedMetrics } from './hooks/use-synced-metrics'
import { useTeamMetrics } from './store'

interface StartRateChartProps {
  teamId: string
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  initialTimeframe: ParsedTimeframe
}

export default function StartRateChartClient({
  teamId,
  initialData,
  initialTimeframe,
}: StartRateChartProps) {
  const chartRef = useRef<echarts.ECharts | null>(null)
  const isRegisteredRef = useRef(false)
  const { timeframe, registerChart, unregisterChart } = useTeamMetrics()

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current && isRegisteredRef.current) {
        unregisterChart(chartRef.current)
        chartRef.current = null
        isRegisteredRef.current = false
      }
    }
  }, [unregisterChart])

  // create a complete timeframe object for the hook
  // always use store timeframe as it's the source of truth
  const syncedTimeframe = useMemo(() => {
    return {
      start: timeframe.start,
      end: timeframe.end,
      isLive: timeframe.isLive,
      duration: timeframe.end - timeframe.start,
    }
  }, [timeframe.start, timeframe.end, timeframe.isLive])

  // use synced metrics hook for consistent fetching
  const { data, isPolling } = useSyncedMetrics({
    teamId,
    timeframe: syncedTimeframe,
    initialData,
  })

  const lineData = useMemo(() => {
    if (!data?.metrics || !data?.step) {
      return []
    }

    // fill zeros before transforming to line data
    const filledMetrics = fillMetricsWithZeros(
      data.metrics,
      timeframe.start,
      timeframe.end,
      data.step
    )

    return transformMetricsToLineData<ClientTeamMetric>(
      filledMetrics,
      (d) => d.timestamp,
      (d) => d.sandboxStartRate
    )
  }, [data?.metrics, data?.step, timeframe.start, timeframe.end])

  const average = useMemo(() => calculateAverage(lineData), [lineData])

  const cssVars = useCssVars([
    '--bg-inverted',
    '--graph-area-fg-from',
    '--graph-area-fg-to',
  ] as const)

  const tooltipFormatter = useMemo(
    () =>
      createSingleValueTooltipFormatter({
        step: data?.step || 0,
        label: 'sandboxes/s',
        valueClassName: 'text-fg',
      }),
    [data?.step]
  )

  return (
    <div className="p-3 md:p-6 border-b w-full h-full flex flex-col flex-1 md:min-h-0">
      <div className="md:min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase max-md:text-sm">
          Start Rate per Second
          <ReactiveLiveBadge show={isPolling} className="ml-3" />
        </span>
        <div className="inline-flex items-end gap-2 md:gap-3 mt-1 md:mt-2">
          <span className="prose-value-big max-md:text-2xl">
            {formatDecimal(average, 1)}
          </span>
          <span className="label-tertiary max-md:text-xs">
            <span className="max-md:hidden">
              over {formatAveragingPeriod(data?.step || 0)}
            </span>
            <span className="md:hidden">avg</span>
          </span>
        </div>
      </div>

      <LineChart
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
        onZoomEnd={(from, end) => {
          // no need to do anything here, since concurrent chart will handle this already
        }}
        group="sandboxes-monitoring"
        onChartReady={(chart) => {
          // if we have a previous chart instance that's different, unregister it
          if (
            chartRef.current &&
            chartRef.current !== chart &&
            isRegisteredRef.current
          ) {
            unregisterChart(chartRef.current)
            isRegisteredRef.current = false
          }

          // only register if this is a new chart instance
          if (!isRegisteredRef.current || chartRef.current !== chart) {
            chartRef.current = chart
            registerChart(chart)
            isRegisteredRef.current = true
          }
        }}
        duration={syncedTimeframe.duration}
        syncAxisPointers={true}
        showTooltip={true}
        tooltipFormatter={tooltipFormatter}
        option={{
          ...createMonitoringChartOptions({
            timeframe: {
              start:
                lineData.length > 0
                  ? Math.min(lineData[0]?.x as number, timeframe.start)
                  : timeframe.start,
              end:
                lineData.length > 0
                  ? Math.max(
                      lineData[lineData.length - 1]?.x as number,
                      timeframe.end
                    )
                  : timeframe.end,
              isLive: syncedTimeframe.isLive,
            },
          }),
          yAxis: {
            splitNumber: 2,
            max: calculateYAxisMax(lineData),
          },
        }}
        data={[
          createChartSeries({
            id: 'rate',
            name: 'Rate',
            data: lineData,
            lineColor: cssVars['--bg-inverted'],
            areaColors: {
              from: cssVars['--graph-area-fg-from'],
              to: cssVars['--graph-area-fg-to'],
            },
          }),
        ]}
      />
    </div>
  )
}
