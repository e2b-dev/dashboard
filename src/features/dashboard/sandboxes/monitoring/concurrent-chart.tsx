import { ChartPlaceholder } from '@/ui/chart-placeholder'
import TimeSeriesLineChart from '@/ui/data/line-chart'
import { Skeleton } from '@/ui/primitives/skeleton'

interface ConcurrentChartProps {
  isLoading: boolean
}

export default function ConcurrentChart({ isLoading }: ConcurrentChartProps) {
  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">Concurrent</span>
      <div className="inline-flex items-end gap-3 mt-2">
        {isLoading ? (
          <Skeleton className="w-16 h-8 bg-bg-highlight" />
        ) : (
          <span className="prose-value-big">542</span>
        )}
        <span className="label-tertiary">AVG PAST 1H</span>
      </div>
      {isLoading ? (
        <ChartPlaceholder
          isLoading
          classNames={{
            container: 'self-center max-h-60 h-full',
          }}
        />
      ) : (
        <TimeSeriesLineChart
          className="mt-4 h-full"
          optionOverrides={{
            yAxis: {
              splitNumber: 2,
            },
          }}
          data={[
            {
              id: 'sandboxes',
              name: 'Sandboxes',
              data: [
                { x: new Date(Date.now() - 60 * 60 * 1000), y: 100 },
                { x: new Date(Date.now() - 50 * 60 * 1000), y: 200 },
                { x: new Date(Date.now() - 40 * 60 * 1000), y: 300 },
                { x: new Date(Date.now() - 30 * 60 * 1000), y: 400 },
                { x: new Date(Date.now() - 20 * 60 * 1000), y: 500 },
                { x: new Date(Date.now() - 10 * 60 * 1000), y: 600 },
                { x: new Date(Date.now() - 5 * 60 * 1000), y: 700 },
                { x: new Date(Date.now()), y: 800 },
              ],
            },
          ]}
          minimumVisualRangeMs={60 * 60 * 1000}
        />
      )}
    </div>
  )
}
