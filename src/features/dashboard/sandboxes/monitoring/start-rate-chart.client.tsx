'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { formatAveragingPeriod, formatDecimal } from '@/lib/utils/formatting'
import { ParsedTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import LineChart from '@/ui/data/line-chart'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { NonUndefined } from 'react-hook-form'
import {
  calculateAverage,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  createSingleValueTooltipFormatter,
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
  const { timeframe, registerChart } = useTeamMetrics()

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

  const lineData = useMemo(
    () =>
      transformMetricsToLineData<ClientTeamMetric>(
        data?.metrics ?? [],
        (d) => d.timestamp,
        (d) => d.sandboxStartRate
      ),
    [data?.metrics]
  )

  const average = useMemo(() => calculateAverage(lineData), [lineData])

  const cssVars = useCssVars([
    '--graph-6',
    '--graph-area-6-from',
    '--graph-area-6-to',
  ] as const)

  const tooltipFormatter = useMemo(
    () =>
      createSingleValueTooltipFormatter({
        step: data?.step || 0,
        label: 'sandboxes/s',
        valueClassName: 'text-graph-6',
      }),
    [data?.step]
  )

  // visualTimeframe represents the actual data range
  // but we should use the requested timeframe for the chart axis
  const visualTimeframe = useMemo(() => {
    if (lineData.length === 0) {
      return syncedTimeframe
    }

    const dataStart = lineData[0]?.x as number
    const dataEnd = lineData[lineData.length - 1]?.x as number

    // use the requested timeframe for axis, not the data range
    return {
      start: dataStart || syncedTimeframe.start,
      end: dataEnd || syncedTimeframe.end,
      isLive: syncedTimeframe.isLive,
    }
  }, [lineData, syncedTimeframe])

  return (
    <div className="p-3 md:p-6 border-b w-full h-full flex flex-col flex-1 md:min-h-0">
      <div className="md:min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase max-md:text-sm">
          Sandboxes/S
          {isPolling && (
            <span className="ml-2 text-xs text-fg-tertiary">(live)</span>
          )}
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
        onChartReady={registerChart}
        option={{
          ...createMonitoringChartOptions({
            timeframe: visualTimeframe,
          }),
          yAxis: {
            splitNumber: 2,
            max: calculateYAxisMax(lineData),
          },
          tooltip: {
            show: true,
            trigger: 'axis',
            formatter: tooltipFormatter,
          },
        }}
        data={[
          createChartSeries({
            id: 'rate',
            name: 'Rate',
            data: lineData,
            lineColor: cssVars['--graph-6'],
            areaColors: {
              from: cssVars['--graph-area-6-from'],
              to: cssVars['--graph-area-6-to'],
            },
          }),
        ]}
      />
    </div>
  )
}
