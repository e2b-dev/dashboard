'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { ChartContainer, ChartTooltip } from '@/ui/primitives/chart'
import { pickEvenTicks } from './chart-utils'

export interface HoverSection {
  swatch: { fill: string; border: string }
  totalLabel: string
  totalValue: string
  rows: { label: string; value: string }[]
}

export interface CardModel {
  sections: HoverSection[]
  totalLabel: string
  totalValue: string
}

/** One stacked slice of the hovered column, ordered top-to-bottom. */
export interface ColumnSegment {
  fraction: number
  fill: string
  border: string
}

interface Point {
  x: string
  y: number
}

type HoverState = { index: number; x: number } | null

const CHART_MARGIN = { top: 4, right: 4, bottom: 0, left: 0 }
// Explicit so value→pixel math (for the hovered column) is deterministic.
const X_AXIS_HEIGHT = 28
const Y_AXIS_WIDTH = 48

interface UsageAreaChartProps {
  series: Point[]
  color: string
  axisFormat: (value: number) => string
  plotClassName?: string
  /** Full label for the hovered bucket (defaults to the axis label). */
  labelFor?: (index: number) => string
  /** Stacked slices of the hovered column (top-to-bottom, fractions sum to 1). */
  segments: (index: number) => ColumnSegment[]
  card: (index: number) => CardModel
}

export function UsageAreaChart({
  series,
  color,
  axisFormat,
  plotClassName = 'min-h-0 flex-1',
  labelFor,
  segments,
  card,
}: UsageAreaChartProps) {
  const gradientId = `usage-fill-${useId().replace(/:/g, '')}`
  const [hovered, setHovered] = useState<HoverState>(null)

  const xTicks = useMemo(
    () => pickEvenTicks(series.map((point) => point.x)),
    [series]
  )
  const domainMax = useMemo(() => {
    const max = Math.max(0, ...series.map((point) => point.y))
    return max > 0 ? max * 1.15 : 1
  }, [series])

  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const point = hovered != null ? series[hovered.index] : undefined
  const plotHeight = size.height - CHART_MARGIN.top - X_AXIS_HEIGHT
  const pointY =
    point && plotHeight > 0
      ? CHART_MARGIN.top + (1 - point.y / domainMax) * plotHeight
      : null
  const plotBottom = size.height - X_AXIS_HEIGHT
  const plotWidth = Math.max(0, size.width - Y_AXIS_WIDTH - CHART_MARGIN.right)
  const columnWidth =
    series.length > 1 ? Math.max(6, plotWidth / (series.length - 1)) : plotWidth
  const columnLeft = hovered
    ? Math.max(Y_AXIS_WIDTH, hovered.x - columnWidth / 2)
    : 0
  const columnRenderWidth = hovered
    ? Math.max(
        0,
        Math.min(size.width - CHART_MARGIN.right, hovered.x + columnWidth / 2) -
          columnLeft
      )
    : 0
  const flipCard = hovered != null && hovered.x > size.width / 2

  return (
    <div
      ref={plotRef}
      className={cn(
        'relative w-full [&_.recharts-wrapper]:cursor-pointer!',
        hovered && '[&_.recharts-area]:opacity-30',
        plotClassName
      )}
    >
      <ChartContainer
        config={{}}
        className="absolute inset-0 aspect-auto h-full w-full"
      >
        <AreaChart
          data={series}
          margin={CHART_MARGIN}
          onMouseMove={(state) => {
            const index = state.activeTooltipIndex
            const x = state.activeCoordinate?.x
            // activeCoordinate snaps to the data point, so bail out while the
            // cursor stays on the same day to avoid a re-render per pixel.
            setHovered((prev) => {
              if (typeof index !== 'number' || typeof x !== 'number') {
                return null
              }
              if (prev && prev.index === index && prev.x === x) {
                return prev
              }
              return { index, x }
            })
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--stroke)"
          />
          <XAxis
            dataKey="x"
            height={X_AXIS_HEIGHT}
            ticks={xTicks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            width={Y_AXIS_WIDTH}
            domain={[0, domainMax]}
            tickLine={false}
            axisLine={false}
            tickFormatter={axisFormat}
          />
          {/* Invisible: only present so onMouseMove reports the active point. */}
          <ChartTooltip cursor={false} content={() => null} />
          <Area
            type="step"
            dataKey="y"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>

      {hovered && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0"
          style={{
            left: `${hovered.x}px`,
            borderLeft: '1px dashed var(--text-secondary, #E0E0E0)',
          }}
        />
      )}

      {hovered && point && pointY != null && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0"
            style={{
              top: `${pointY}px`,
              borderTop: '1px dashed var(--text-secondary, #E0E0E0)',
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${columnLeft}px`,
              top: `${pointY}px`,
              width: `${columnRenderWidth}px`,
              height: `${plotBottom - pointY}px`,
            }}
          >
            {(() => {
              const totalHeight = plotBottom - pointY
              let offset = 0
              return segments(hovered.index).map((segment) => {
                const segmentHeight = totalHeight * segment.fraction
                const top = offset
                offset += segmentHeight
                return (
                  <div
                    key={segment.border}
                    className="absolute inset-x-0 border-[1.5px]"
                    style={{
                      top: `${top}px`,
                      height: `${segmentHeight}px`,
                      backgroundColor: segment.fill,
                      borderColor: segment.border,
                    }}
                  />
                )
              })
            })()}
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute left-0 flex h-[18px] -translate-y-1/2 items-center justify-end"
            style={{ top: `${pointY}px`, width: `${Y_AXIS_WIDTH}px` }}
          >
            <span
              className="text-fg prose-label flex h-[18px] items-center px-1.5 font-mono whitespace-nowrap uppercase backdrop-blur-[6px]"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              {axisFormat(point.y)}
            </span>
          </div>

          <div
            aria-hidden
            className="text-fg prose-label pointer-events-none absolute bottom-0 flex h-[18px] -translate-x-1/2 items-center px-1.5 font-mono whitespace-nowrap uppercase backdrop-blur-[6px]"
            style={{
              left: `${hovered.x}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {labelFor?.(hovered.index) ?? point.x}
          </div>

          <HoverCard
            {...card(hovered.index)}
            style={
              flipCard
                ? {
                    right: `${size.width - hovered.x + columnWidth / 2 + 12}px`,
                    top: `${pointY}px`,
                  }
                : {
                    left: `${hovered.x + columnWidth / 2 + 12}px`,
                    top: `${pointY}px`,
                  }
            }
          />
        </>
      )}
    </div>
  )
}

function HoverCard({
  sections,
  totalLabel,
  totalValue,
  style,
}: CardModel & { style: React.CSSProperties }) {
  return (
    <div
      className="border-stroke bg-bg-1 pointer-events-none absolute z-10 flex min-w-[240px] -translate-y-1/2 flex-col gap-2 rounded-md border px-3 py-2 shadow-xl"
      style={style}
    >
      {sections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {sections.map((section) => (
            <div key={section.totalLabel} className="flex flex-col gap-1.5">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="prose-label text-fg-tertiary uppercase">
                    {row.label}
                  </span>
                  <span className="prose-body-numeric text-fg-secondary font-mono">
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-[15px] shrink-0 border-[1.5px]"
                    style={{
                      backgroundColor: section.swatch.fill,
                      borderColor: section.swatch.border,
                    }}
                  />
                  <span className="prose-label text-fg-secondary font-medium uppercase">
                    {section.totalLabel}
                  </span>
                </span>
                <span className="prose-body-numeric text-fg font-mono font-medium">
                  {section.totalValue}
                </span>
              </div>
              <div
                className="h-px w-full"
                style={{ backgroundColor: 'var(--stroke)' }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <span className="prose-label text-fg-tertiary uppercase">
          {totalLabel}
        </span>
        <span className="prose-body-numeric text-fg font-mono font-medium">
          {totalValue}
        </span>
      </div>
    </div>
  )
}
