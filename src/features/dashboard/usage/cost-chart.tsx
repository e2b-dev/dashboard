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

export function CostChart({ data }: { data: UsageData['compute'] }) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      x: `${item.month}/${item.year}`,
      y: item.total_cost,
    }))
  }, [data])

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-48">
      <AreaChart data={chartData} {...commonChartProps}>
        <defs>
          <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cost)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--color-cost)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" {...commonXAxisProps} />
        <YAxis
          {...commonYAxisProps}
          tickFormatter={(value) => `$${bigNumbersAxisTickFormatter(value)}`}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length || !payload[0]?.payload)
              return null

            return (
              <ChartTooltipContent
                labelFormatter={() => label}
                formatter={(value, name, item) => [
                  <span key="value" className="text-accent-main-highlight ">
                    {Number(value).toFixed(2).toLocaleString()}
                  </span>,
                  `$`,
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
          stroke="var(--color-cost)"
          strokeWidth={2}
          fill="url(#cost)"
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}
