'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { formatAveragingPeriod, formatDecimal } from '@/lib/utils/formatting'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
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
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface StartRateChartProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
}

export default function StartRateChartClient({
  initialData,
}: StartRateChartProps) {
  const { timeframe, registerChart } = useTeamMetrics()

  let { data } = useTeamMetricsSWR(initialData)

  if (!data) {
    data = initialData
  }

  const lineData = useMemo(
    () =>
      transformMetricsToLineData(
        data.metrics,
        (d) => d.timestamp,
        (d) => d.sandboxStartRate
      ),
    [data.metrics]
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
        step: data.step,
        label: 'sandboxes/s',
        valueClassName: 'text-graph-6',
      }),
    [data.step]
  )

  return (
    <div className="p-3 md:p-6 border-b w-full h-full flex flex-col flex-1 md:min-h-0">
      <div className="md:min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase max-md:text-sm">
          Sandboxes/S
        </span>
        <div className="inline-flex items-end gap-2 md:gap-3 mt-1 md:mt-2">
          <span className="prose-value-big max-md:text-2xl">
            {formatDecimal(average, 1)}
          </span>
          <span className="label-tertiary max-md:text-xs">
            <span className="max-md:hidden">
              over {formatAveragingPeriod(data.step)}
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
            timeframe,
            splitNumber: 2,
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
