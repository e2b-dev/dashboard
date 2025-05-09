'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  chartConfig,
  commonChartProps,
  commonXAxisProps,
  commonYAxisProps,
} from './chart-config'
import { SandboxesStartedData } from '@/server/usage/types'

import { useMemo, useState } from 'react'
import { Button } from '@/ui/primitives/button'

const getWeek = (date: Date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Helper function to get the start and end date of an ISO week
const getDateRangeOfWeek = (weekNumber: number, year: number) => {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  const ISOweekEnd = new Date(ISOweekStart)
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6)
  return { start: ISOweekStart, end: ISOweekEnd }
}

export type GroupingOption = 'week' | 'month'

const CustomBarShape = (props: any) => {
  const { x, y, width, height, fill } = props

  if (width <= 0 || height <= 0) {
    return null
  }

  const desiredRadius = 1
  const r = Math.min(desiredRadius, width / 2, height)

  const borderColor = 'var(--color-contrast-2)'
  const strokeWidth = 1

  const fillPath = `
    M ${x},${y + r}
    A ${r},${r} 0 0 1 ${x + r},${y}
    L ${x + width - r},${y}
    A ${r},${r} 0 0 1 ${x + width},${y + r}
    L ${x + width},${y + height}
    L ${x},${y + height}
    Z
  `

  const borderPath = `
    M ${x},${y + height}
    L ${x},${y + r}
    A ${r},${r} 0 0 1 ${x + r},${y}
    L ${x + width - r},${y}
    A ${r},${r} 0 0 1 ${x + width},${y + r}
    L ${x + width},${y + height}
  `

  return (
    <g>
      <path d={fillPath} fill={fill} />
      <path
        d={borderPath}
        fill="none"
        stroke={borderColor}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

export function SandboxesChart({ data }: { data: SandboxesStartedData }) {
  const [grouping, setGrouping] = useState<GroupingOption>('month')

  const totalSandboxesStarted = data.reduce(
    (acc, curr) => ({
      count: acc.count + curr.count,
    }),
    { count: 0 }
  )

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    if (grouping === 'week') {
      const weeklyData: {
        [key: string]: { x: string; y: number; week: number; year: number }
      } = {}
      data.forEach(({ date, count }) => {
        const year = date.getFullYear()
        const week = getWeek(date)
        const weekKey = `${year}-W${week}`
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { x: `W${week} ${year}`, y: 0, week, year }
        }
        weeklyData[weekKey].y += count
      })
      return Object.values(weeklyData).sort((a, b) =>
        a.year === b.year ? a.week - b.week : a.year - b.year
      )
    }

    if (grouping === 'month') {
      const monthlyData: {
        [key: string]: { x: string; y: number; month: number; year: number }
      } = {}
      data.forEach(({ date, count }) => {
        const year = date.getFullYear()
        const month = date.getMonth() // 0-indexed
        const monthKey = `${year}-${month}`
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            x: date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
            y: 0,
            month,
            year,
          }
        }
        monthlyData[monthKey].y += count
      })
      return Object.values(monthlyData).sort((a, b) =>
        a.year === b.year ? a.month - b.month : a.year - b.year
      )
    }
    return []
  }, [data, grouping])

  const xAxisTickFormatter = (value: string, index: number) => {
    return value
  }

  const yAxisTickFormatter = (value: number, index: number) => {
    return value.toLocaleString()
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-start text-gray-500">
        No sandbox data available for the selected period.
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-2xl">
            {totalSandboxesStarted.count.toLocaleString()}
          </p>
          <span className="text-fg-500 text-xs">total sandboxes</span>
        </div>
        <div className="mb-4 flex gap-2">
          {(['month', 'week'] as GroupingOption[]).map((option) => (
            <Button
              key={option}
              onClick={() => setGrouping(option)}
              variant={grouping === option ? 'default' : 'outline'}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-50">
        <BarChart data={chartData} {...commonChartProps}>
          <defs>
            <pattern
              id="bar-scanlines"
              width="5"
              height="9"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="9"
                x2="5"
                y2="0"
                stroke="var(--color-contrast-2)"
                opacity="0.7"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <XAxis
            dataKey="x"
            {...commonXAxisProps}
            tickFormatter={xAxisTickFormatter}
            interval={
              chartData.length > 30 && grouping === 'week'
                ? Math.floor(chartData.length / 15)
                : 0
            }
            axisLine={{ stroke: 'var(--color-contrast-2)', opacity: 0.3 }}
          />
          <YAxis {...commonYAxisProps} tickFormatter={yAxisTickFormatter} />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length || !payload[0].payload)
                return null

              const dataPoint = payload[0].payload // Actual data for the bar
              let dateRangeString = ''
              const dateFormatOptions: Intl.DateTimeFormatOptions = {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }

              if (
                grouping === 'month' &&
                dataPoint.year !== undefined &&
                dataPoint.month !== undefined
              ) {
                const startDate = new Date(dataPoint.year, dataPoint.month, 1)
                const endDate = new Date(dataPoint.year, dataPoint.month + 1, 0) // 0 day of next month is last day of current month
                dateRangeString = `(${startDate.toLocaleDateString(undefined, dateFormatOptions)} - ${endDate.toLocaleDateString(undefined, dateFormatOptions)})`
              } else if (
                grouping === 'week' &&
                dataPoint.year !== undefined &&
                dataPoint.week !== undefined
              ) {
                const { start, end } = getDateRangeOfWeek(
                  dataPoint.week,
                  dataPoint.year
                )
                dateRangeString = `(${start.toLocaleDateString(undefined, dateFormatOptions)} - ${end.toLocaleDateString(undefined, dateFormatOptions)})`
              }

              return (
                <ChartTooltipContent
                  labelFormatter={() => `${label} ${dateRangeString}`}
                  formatter={(value, name, item) => [
                    <span key="value" className="text-accent">
                      {Number(value).toLocaleString()}
                    </span>,
                    `Sandboxes Started`,
                  ]}
                  payload={payload}
                  active={active}
                />
              )
            }}
          />
          <Bar
            dataKey="y"
            fill="url(#bar-scanlines)"
            shape={<CustomBarShape />}
          />
        </BarChart>
      </ChartContainer>
    </>
  )
}
