'use client'

import {
  chartConfig,
  commonChartProps,
} from '@/features/dashboard/usage/chart-config'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Area, AreaChart } from 'recharts'
import { Card } from './primitives/card'

interface ChartPlaceholderProps {
  classNames?: {
    container?: string
    card?: string
  }
  placeholderBg?: string
  shimmerBg?: string
  emptyContent?: React.ReactNode
  isLoading?: boolean
}

export function ChartPlaceholder({
  classNames,
  emptyContent,
  isLoading,
  placeholderBg = 'var(--bg)',
  shimmerBg = 'var(--bg-highlight)',
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
    <div
      className="relative aspect-auto flex h-full w-full"
      style={
        {
          '--placeholder-bg': placeholderBg,
        } as React.CSSProperties
      }
    >
      <ChartContainer
        config={chartConfig}
        className={cn(
          'h-50 w-full',
          classNames?.container,
          // Apply fading gradient styles ONLY when not loading (empty content is shown)
          'before:from-(--placeholder-bg) before:to-(--placeholder-bg) relative before:absolute before:inset-0 before:z-20 before:bg-gradient-to-r before:via-transparent',
          // Add bottom fade gradient
          'after:from-(--placeholder-bg) after:absolute after:inset-x-0 after:bottom-0 after:z-20 after:h-16 after:bg-gradient-to-t after:to-transparent'
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
                <stop offset="0%" stopColor="var(--placeholder-bg)" />
                <stop offset="45%" stopColor={shimmerBg} stopOpacity={1} />
                <stop offset="50%" stopColor={shimmerBg} stopOpacity={1} />
                <stop offset="55%" stopColor={shimmerBg} stopOpacity={1} />
                <stop offset="100%" stopColor="var(--placeholder-bg)" />
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
                  stopColor="var(--color-fg-tertiary)"
                  stopOpacity={0.1} // More subtle for background
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-fg-tertiary)"
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
            type="step"
            dataKey="y"
            stroke={'var(--stroke)'}
            strokeWidth={1}
            strokeOpacity={0.8}
            fillOpacity={1}
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
            {emptyContent ?? <p className="text-fg ">No data available</p>}
          </Card>
        )}
      </div>
    </div>
  )
}
