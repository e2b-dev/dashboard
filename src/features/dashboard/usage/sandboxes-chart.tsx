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
import { UsageData } from '@/server/usage/types'
import { useMemo, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { BoxIcon } from 'lucide-react'

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

// --- Utility Types ---
type MonthChartPoint = {
  x: string
  y: number
  year: number
  month: number
  originalDate: Date
}
type WeekChartPoint = {
  x: string
  y: number
  year: number
  week: number
  originalDate: Date
}

// --- Date Helpers (UTC) ---
function getUTCMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`
}
function getUTCWeekKey(date: Date) {
  return `${date.getUTCFullYear()}-W${getWeek(date)}`
}

// --- Aggregation Helpers ---
function aggregateSandboxesByMonth(
  data: { date: Date | string; count: number }[]
): MonthChartPoint[] {
  const map: Record<string, MonthChartPoint> = {}
  data.forEach(({ date, count }) => {
    const d = new Date(date)
    const key = getUTCMonthKey(d)
    if (!map[key]) {
      map[key] = {
        x: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        y: 0,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        originalDate: d,
      }
    }
    map[key].y += count
  })
  return Object.values(map).sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year
  )
}

function aggregateSandboxesByWeek(
  data: { date: Date | string; count: number }[]
): WeekChartPoint[] {
  const map: Record<string, WeekChartPoint> = {}
  data.forEach(({ date, count }) => {
    const d = new Date(date)
    const year = d.getUTCFullYear()
    const week = getWeek(d)
    const key = getUTCWeekKey(d)
    if (!map[key]) {
      map[key] = {
        x: `W${week} ${year}`,
        y: 0,
        year,
        week,
        originalDate: d,
      }
    }
    map[key].y += count
  })
  return Object.values(map).sort((a, b) =>
    a.year === b.year ? a.week - b.week : a.year - b.year
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
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!data?.length) return []
    return grouping === 'month'
      ? aggregateSandboxesByMonth(data)
      : aggregateSandboxesByWeek(data)
  }, [data, grouping])

  // Memoized totals
  const totalSandboxes = useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data]
  )
  const totalThisMonth = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getUTCMonth()
    const thisYear = now.getUTCFullYear()
    return data.reduce((sum, d) => {
      const date = new Date(d.date)
      return date.getUTCMonth() === thisMonth &&
        date.getUTCFullYear() === thisYear
        ? sum + d.count
        : sum
    }, 0)
  }, [data])

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <p className="text-accent font-mono text-2xl">
            {totalSandboxes.toLocaleString()}
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
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-2xl">
            {totalThisMonth.toLocaleString()}
          </p>
          <p className="text-fg-500 text-xs whitespace-nowrap">
            sandboxes this month
          </p>
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
              if (
                !active ||
                !payload ||
                !payload.length ||
                !payload[0]?.payload
              )
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
                const startDate = new Date(
                  Date.UTC(dataPoint.year, dataPoint.month, 1)
                )
                const endDate = new Date(
                  Date.UTC(dataPoint.year, dataPoint.month + 1, 0)
                )
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
