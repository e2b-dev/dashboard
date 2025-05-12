'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import {
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
        <YAxis {...commonYAxisProps} />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload) return null
            return (
              <ChartTooltipContent
                formatter={(value) => [
                  <span key="value">{Number(value).toFixed(2)}</span>,
                  'vCPU Hours',
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
        />
      </AreaChart>
    </ChartContainer>
  )
}
