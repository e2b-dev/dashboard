'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import {
  bigNumbersAxisTickFormatter,
  chartConfig,
  commonChartProps,
  commonXAxisProps,
  commonYAxisProps,
} from './chart-config'
import { UsageData } from '@/server/usage/types'
import { useMemo } from 'react'

interface VCPUChartProps {
  data: UsageData['compute']
}

export function VCPUChart({ data }: VCPUChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      x: `${item.month}/${item.year}`,
      y: item.vcpu_hours,
    }))
  }, [data])

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-36">
      <AreaChart data={chartData} {...commonChartProps}>
        <defs>
          <linearGradient id="vcpu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-vcpu)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--color-vcpu)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" {...commonXAxisProps} />
        <YAxis
          {...commonYAxisProps}
          tickFormatter={bigNumbersAxisTickFormatter}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length || !payload[0].payload)
              return null

            return (
              <ChartTooltipContent
                labelFormatter={() => label}
                formatter={(value, name, item) => [
                  <span key="value" className="text-accent">
                    {Number(value).toLocaleString()}
                  </span>,
                  `vCPU Hours`,
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
          stroke="var(--color-vcpu)"
          strokeWidth={2}
          fill="url(#vcpu)"
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}
