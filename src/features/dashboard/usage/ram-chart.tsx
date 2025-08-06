'use client'

import { UsageData } from '@/server/usage/types'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { useMemo } from 'react'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import {
  bigNumbersAxisTickFormatter,
  chartConfig,
  commonChartProps,
  commonXAxisProps,
  commonYAxisProps,
} from './chart-config'

interface RAMChartProps {
  data: UsageData['compute']
}

export function RAMChart({ data }: RAMChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      x: `${item.month}/${item.year}`,
      y: item.ram_gb_hours,
    }))
  }, [data])

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-36">
      <AreaChart data={chartData} {...commonChartProps}>
        <defs>
          <linearGradient id="ram" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-ram)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--color-ram)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" {...commonXAxisProps} />
        <YAxis
          {...commonYAxisProps}
          tickFormatter={bigNumbersAxisTickFormatter}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length || !payload[0]?.payload)
              return null

            const dataPoint = payload[0]!.payload // Actual data for the bar
            let dateRangeString = ''
            const dateFormatOptions: Intl.DateTimeFormatOptions = {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }

            if (dataPoint.year !== undefined && dataPoint.month !== undefined) {
              const startDate = new Date(dataPoint.year, dataPoint.month, 1)
              const endDate = new Date(dataPoint.year, dataPoint.month + 1, 0) // 0 day of next month is last day of current month
              dateRangeString = `(${startDate.toLocaleDateString(undefined, dateFormatOptions)} - ${endDate.toLocaleDateString(undefined, dateFormatOptions)})`
            }

            return (
              <ChartTooltipContent
                labelFormatter={() => label}
                formatter={(value, name, item) => [
                  <span key="value" className="text-accent-main-highlight ">
                    {Number(value).toLocaleString()}
                  </span>,
                  `RAM Hours`,
                ]}
                payload={payload}
                active={active}
              />
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="y"
          stroke="var(--color-ram)"
          strokeWidth={2}
          fill="url(#ram)"
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}
