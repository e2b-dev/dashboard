'use client'

import { AnimatedMetricDisplay } from '@/features/dashboard/sandboxes/monitoring/charts/animated-metric-display'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  cardVariants,
} from '@/ui/primitives/card'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from '@/ui/primitives/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import ComputeUsageChart from './compute-usage-chart'
import { useUsageCharts } from './usage-charts-context'
import { UsageTimeRangeControls } from './usage-time-range-controls'

type UsageMetricType = 'sandboxes' | 'cost' | 'vcpu' | 'ram'

interface MetricConfig {
  title: string
}

const METRIC_CONFIGS: Record<UsageMetricType, MetricConfig> = {
  sandboxes: { title: 'Started & Resumed Sandboxes' },
  cost: { title: 'Usage Cost' },
  vcpu: { title: 'vCPU Hours' },
  ram: { title: 'RAM Hours' },
}

interface UsageMetricChartProps {
  metric: UsageMetricType
  className?: string
  timeRangeControlsClassName?: string
}

export function UsageMetricChart({
  metric,
  className,
  timeRangeControlsClassName,
}: UsageMetricChartProps) {
  const {
    displayedData,
    setHoveredIndex,
    timeframe,
    setTimeframe,
    displayValues,
    samplingMode,
    onBrushEnd,
    fullscreenMetric,
    setFullscreenMetric,
  } = useUsageCharts()

  const [isChartHovered, setIsChartHovered] = useState(false)

  const config = METRIC_CONFIGS[metric]
  const { displayValue, label, timestamp } = displayValues[metric]
  const data = displayedData[metric]

  const isFullscreen = fullscreenMetric === metric

  const renderChartContent = (forceShowControls = false) => (
    <>
      <CardHeader className="space-y-2">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2">
          <span className="prose-label-highlight uppercase max-md:text-sm">
            {config.title}
          </span>
          <UsageTimeRangeControls
            timeframe={timeframe}
            onTimeRangeChange={setTimeframe}
            className={cn(
              'max-lg:self-start',
              forceShowControls ? '' : timeRangeControlsClassName
            )}
          />
        </div>
        <AnimatedMetricDisplay
          value={displayValue}
          label={label}
          timestamp={timestamp}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 min-h-0">
        <div
          className="flex-1 min-h-0 relative"
          onMouseEnter={() => setIsChartHovered(true)}
          onMouseLeave={() => setIsChartHovered(false)}
        >
          <ComputeUsageChart
            type={metric}
            data={data}
            samplingMode={samplingMode}
            onHover={setHoveredIndex}
            onHoverEnd={() => setHoveredIndex(null)}
            onBrushEnd={onBrushEnd}
          />
          {isChartHovered && !isFullscreen && (
            <Button
              onClick={() => setFullscreenMetric(metric)}
              variant="ghost"
              size="iconSm"
              className={cn(
                cardVariants({ variant: 'layer' }),
                'hidden lg:flex absolute top-4 right-4 opacity-70 hover:opacity-100 animate-fade-slide-in'
              )}
              aria-label="Expand chart to fullscreen"
            >
              <Maximize2 className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </>
  )

  return (
    <>
      {!isFullscreen && (
        <Card className={cn('h-full flex flex-col', className)}>
          {renderChartContent(false)}
        </Card>
      )}

      {isFullscreen && (
        <Dialog
          open={isFullscreen}
          onOpenChange={(open) => !open && setFullscreenMetric(null)}
        >
          <DialogPortal>
            <DialogTitle className="sr-only">
              {METRIC_CONFIGS[metric].title}
            </DialogTitle>
            <DialogOverlay />
            <DialogContent
              className="sm:max-w-[min(90svw,2200px)] w-full max-h-[min(70svh,1200px)] h-full border-0 p-0"
              hideClose
            >
              <Card className="h-full flex flex-col border-0">
                {renderChartContent(true)}
              </Card>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </>
  )
}
