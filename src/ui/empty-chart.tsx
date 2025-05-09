'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Area, AreaChart } from 'recharts'
import {
  chartConfig,
  commonChartProps,
} from '@/features/dashboard/usage/chart-config'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card'

interface EmptyChartProps {
  className?: string
  children?: React.ReactNode
}

export function EmptyChart({ className, children }: EmptyChartProps) {
  const mockData = Array.from({ length: 20 }, (_, i) => {
    const date = new Date(2024, 0, i + 1)
    const formattedDate = date.toISOString().split('T')[0]

    const value = Math.floor(Math.random() * 300) + 50

    return {
      x: formattedDate,
      y: value,
    }
  })

  return (
    <div className="relative aspect-auto h-48">
      <ChartContainer
        config={chartConfig}
        className={cn(
          'before:from-bg-100 before:to-bg-100 relative aspect-auto h-48 before:absolute before:inset-0 before:z-20 before:bg-gradient-to-r before:via-transparent',
          className
        )}
      >
        <AreaChart data={mockData} {...commonChartProps}>
          <defs>
            <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-fg-500)"
                stopOpacity={0.2}
              />
              <stop
                offset="100%"
                stopColor="var(--color-fg-500)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload) return null
              return (
                <ChartTooltipContent
                  formatter={(value) => [
                    <span key="value">${Number(value).toFixed(2)}</span>,
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
            stroke="var(--color-fg-500)"
            strokeWidth={2}
            opacity={0.2}
            fill="url(#cost)"
          />
        </AreaChart>
      </ChartContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <Card variant="layer" className="p-3">
          {children ?? <p className="text-fg text-sm">No data available</p>}
        </Card>
      </div>
    </div>
  )
}
