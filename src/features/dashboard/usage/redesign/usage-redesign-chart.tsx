'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer } from '@/ui/primitives/chart'

// Static placeholder series — the redesigned usage page is not yet wired to data.
const MOCK_SERIES = [
  { label: '1 Mar', value: 420 },
  { label: '2 Mar', value: 610 },
  { label: '3 Mar', value: 580 },
  { label: '4 Mar', value: 720 },
  { label: '5 Mar', value: 690 },
  { label: '6 Mar', value: 540 },
  { label: '7 Mar', value: 510 },
  { label: '8 Mar', value: 480 },
  { label: '9 Mar', value: 360 },
  { label: '10 Mar', value: 220 },
  { label: '11 Mar', value: 470 },
  { label: '12 Mar', value: 560 },
  { label: '13 Mar', value: 630 },
  { label: '14 Mar', value: 700 },
  { label: '15 Mar', value: 760 },
  { label: '16 Mar', value: 820 },
  { label: '17 Mar', value: 780 },
  { label: '18 Mar', value: 690 },
  { label: '19 Mar', value: 640 },
  { label: '20 Mar', value: 590 },
  { label: '21 Mar', value: 520 },
  { label: '22 Mar', value: 460 },
  { label: '23 Mar', value: 410 },
  { label: '24 Mar', value: 380 },
]

const X_TICKS = ['1 Mar', '7 Mar', '14 Mar', '24 Mar']

export function UsageRedesignChart() {
  return (
    <ChartContainer config={{}} className="aspect-auto h-45 w-full">
      <AreaChart
        data={MOCK_SERIES}
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="usageRedesignFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--graph-area-accent-main-from)"
              stopOpacity={1}
            />
            <stop
              offset="100%"
              stopColor="var(--graph-area-accent-main-from)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--stroke)"
        />
        <XAxis
          dataKey="label"
          ticks={X_TICKS}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Area
          type="step"
          dataKey="value"
          stroke="var(--accent-main-highlight)"
          strokeWidth={1.5}
          fill="url(#usageRedesignFill)"
          fillOpacity={1}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
