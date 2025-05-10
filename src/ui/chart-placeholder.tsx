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

interface ChartPlaceholderProps {
  classNames?: {
    container?: string
    card?: string
  }
  emptyContent?: React.ReactNode
  isLoading?: boolean
}

export function ChartPlaceholder({
  classNames,
  emptyContent,
  isLoading,
}: ChartPlaceholderProps) {
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
    <div className="relative aspect-auto">
      <ChartContainer
        config={chartConfig}
        className={cn(
          'h-50 w-full',
          classNames?.container,
          // Apply fading gradient styles ONLY when not loading (empty content is shown)
          'before:from-bg-100 before:to-bg-100 relative before:absolute before:inset-0 before:z-20 before:bg-gradient-to-r before:via-transparent',
          // Add bottom fade gradient
          'after:from-bg-100 after:absolute after:inset-x-0 after:bottom-0 after:z-20 after:h-16 after:bg-gradient-to-t after:to-transparent'
        )}
      >
        <AreaChart data={mockData} {...commonChartProps}>
          <defs>
            {isLoading ? (
              <linearGradient
                id="animatedLoadingFill"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-bg-100)"
                  stopOpacity="0.1"
                />
                <stop
                  offset="45%"
                  stopColor="var(--color-bg-400)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="50%"
                  stopColor="var(--color-bg-400)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="55%"
                  stopColor="var(--color-bg-400)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-bg-100)"
                  stopOpacity="0.1"
                />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  values="-1 0; 2 0"
                  dur="1.8s"
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </linearGradient>
            ) : (
              <linearGradient
                id="staticBackgroundFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-fg-500)"
                  stopOpacity={0.1} // More subtle for background
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-fg-500)"
                  stopOpacity={0}
                />
              </linearGradient>
            )}
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
            stroke={'var(--color-fg-500)'}
            strokeWidth={2}
            strokeOpacity={0.15} // More subtle for background
            fillOpacity={1} // Opacity handled by gradient stops
            fill={
              isLoading
                ? 'url(#animatedLoadingFill)'
                : 'url(#staticBackgroundFill)'
            }
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>

      <div className="absolute inset-0 z-30 flex items-center justify-center">
        {!isLoading && (
          <Card variant="layer" className={cn('p-3', classNames?.card)}>
            {emptyContent ?? (
              <p className="text-fg text-sm">No data available</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
