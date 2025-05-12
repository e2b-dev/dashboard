'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { Bar, BarChart, BarProps, XAxis, YAxis } from 'recharts'
import {
  bigNumbersAxisTickFormatter,
  chartConfig,
  commonChartProps,
  commonXAxisProps,
  commonYAxisProps,
} from './chart-config'
import { SandboxesUsageDelta, UsageData } from '@/server/usage/types'
import { useMemo, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'

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

// Helper to iterate through months in a range
function* iterateMonths(startDate: Date, endDate: Date) {
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const finalMonthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (currentDate <= finalMonthDate) {
    yield {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(), // 0-indexed
      date: new Date(currentDate),
    }
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
}

// Helper to iterate through weeks in a range
function* iterateWeeks(startDate: Date, endDate: Date) {
  // Start from the Monday of the week of startDate
  const currentDate = new Date(startDate)
  currentDate.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7)) // Set to Monday
  currentDate.setHours(0, 0, 0, 0)

  const finalWeekEndDate = new Date(endDate)
  finalWeekEndDate.setDate(
    finalWeekEndDate.getDate() - ((finalWeekEndDate.getDay() + 6) % 7) + 6
  ) // Sunday of end week
  finalWeekEndDate.setHours(23, 59, 59, 999)

  while (currentDate <= finalWeekEndDate) {
    const year = currentDate.getFullYear()
    const week = getWeek(currentDate) // Assumes getWeek handles any day in the week correctly
    yield {
      year,
      week,
      // Use the start of the week (Monday) for consistent representation
      date: new Date(currentDate),
    }
    currentDate.setDate(currentDate.getDate() + 7)
  }
}

const CustomBarShape = (props: BarProps) => {
  const { width, height, fill } = props
  const x = Number(props.x)
  const y = Number(props.y)

  if (
    width === undefined ||
    width <= 0 ||
    height === undefined ||
    height <= 0 ||
    x === undefined ||
    y === undefined
  ) {
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

interface SandboxesChartProps {
  data: UsageData['sandboxes']
  classNames?: {
    container?: string
  }
}

export function SandboxesChart({ data, classNames }: SandboxesChartProps) {
  const [grouping, setGrouping] = useState<GroupingOption>('month')
  const [dynamicXAxisInterval, setDynamicXAxisInterval] = useState(0)
  const chartContainerRef = useRef<HTMLDivElement>(null)

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

    const aggregatedData: {
      [key: string]: {
        x: string
        y: number
        year: number
        month?: number // For month grouping
        week?: number // For week grouping
        originalDate: Date // Store original date for reference or exact labeling if needed
      }
    } = {}

    let minDataDate = new Date(data[0].date)
    let maxDataDate = new Date(data[0].date)

    data.forEach(({ date, count }) => {
      const d = new Date(date)
      if (d < minDataDate) minDataDate = d
      if (d > maxDataDate) maxDataDate = d

      if (grouping === 'week') {
        const year = d.getFullYear()
        const week = getWeek(d)
        const weekKey = `${year}-W${week}`
        if (!aggregatedData[weekKey]) {
          aggregatedData[weekKey] = {
            x: `W${week} ${year}`,
            y: 0,
            week,
            year,
            originalDate: d,
          }
        }
        aggregatedData[weekKey].y += count
      } else if (grouping === 'month') {
        const year = d.getFullYear()
        const month = d.getMonth() // 0-indexed
        const monthKey = `${year}-${month}`
        if (!aggregatedData[monthKey]) {
          aggregatedData[monthKey] = {
            x: d.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
            y: 0,
            month,
            year,
            originalDate: d,
          }
        }
        aggregatedData[monthKey].y += count
      }
    })

    const finalChartData = []
    let chartStartDate: Date
    let chartEndDate: Date

    if (grouping === 'month') {
      const minMonths = 6
      chartEndDate = new Date(maxDataDate)
      const preliminaryStartDate = new Date(maxDataDate)
      preliminaryStartDate.setMonth(
        preliminaryStartDate.getMonth() - (minMonths - 1)
      )
      preliminaryStartDate.setDate(1) // Start of the month
      preliminaryStartDate.setHours(0, 0, 0, 0)

      chartStartDate =
        minDataDate < preliminaryStartDate
          ? new Date(minDataDate)
          : preliminaryStartDate
      chartStartDate.setDate(1)
      chartStartDate.setHours(0, 0, 0, 0)

      for (const { year, month, date: currentPeriodDate } of iterateMonths(
        chartStartDate,
        chartEndDate
      )) {
        const monthKey = `${year}-${month}`
        const dataPoint = aggregatedData[monthKey]
        finalChartData.push({
          x: currentPeriodDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          y: dataPoint ? dataPoint.y : 0,
          month,
          year,
        })
      }
    } else if (grouping === 'week') {
      const minWeeks = 12
      chartEndDate = new Date(maxDataDate)
      const preliminaryStartDate = new Date(maxDataDate)
      preliminaryStartDate.setDate(
        preliminaryStartDate.getDate() - (minWeeks - 1) * 7
      )
      // Align preliminaryStartDate to the start of its week (Monday)
      preliminaryStartDate.setDate(
        preliminaryStartDate.getDate() -
          ((preliminaryStartDate.getDay() + 6) % 7)
      )
      preliminaryStartDate.setHours(0, 0, 0, 0)

      chartStartDate =
        minDataDate < preliminaryStartDate
          ? new Date(minDataDate)
          : preliminaryStartDate
      // Align chartStartDate to the start of its week (Monday)
      chartStartDate.setDate(
        chartStartDate.getDate() - ((chartStartDate.getDay() + 6) % 7)
      )
      chartStartDate.setHours(0, 0, 0, 0)

      for (const { year, week, date: currentPeriodDate } of iterateWeeks(
        chartStartDate,
        chartEndDate
      )) {
        const weekKey = `${year}-W${week}`
        const dataPoint = aggregatedData[weekKey]
        finalChartData.push({
          x: `W${week} ${year}`,
          y: dataPoint ? dataPoint.y : 0,
          week,
          year,
        })
      }
    }

    // Sort, just in case iteration order wasn't perfect or if minDataDate extended range significantly
    if (grouping === 'month') {
      finalChartData.sort((a, b) =>
        a.year === b.year ? a.month! - b.month! : a.year - b.year
      )
    } else if (grouping === 'week') {
      finalChartData.sort((a, b) =>
        a.year === b.year ? a.week! - b.week! : a.year - b.year
      )
    }

    return finalChartData
  }, [data, grouping])

  return (
    <>
      <div className="flex gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
          <p className="font-mono text-2xl">
            {totalSandboxesStarted.count.toLocaleString()}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-fg-500 text-xs whitespace-nowrap">
              total sandboxes, grouped by
            </span>
            <Select
              value={grouping}
              onValueChange={(value) => setGrouping(value as GroupingOption)}
            >
              <SelectTrigger
                classNames={{
                  trigger:
                    'text-accent bg-transparent font-medium border-0 h-auto p-0 text-xs cursor-pointer',
                  icon: 'ml-1 text-accent stroke-[2px]!',
                }}
              >
                <SelectValue placeholder="Select grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month" className="text-xs">
                  Month
                </SelectItem>
                <SelectItem value="week" className="text-xs">
                  Week
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <ChartContainer
        config={chartConfig}
        className={cn('aspect-auto h-50', classNames?.container)}
        ref={chartContainerRef}
      >
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
            axisLine={{ stroke: 'var(--color-border)', opacity: 0.5 }}
          />
          <YAxis
            {...commonYAxisProps}
            tickFormatter={bigNumbersAxisTickFormatter}
          />
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
                    <span key="value" className="text-contrast-2">
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
            shape={<CustomBarShape dataKey="x" />}
          />
        </BarChart>
      </ChartContainer>
    </>
  )
}
