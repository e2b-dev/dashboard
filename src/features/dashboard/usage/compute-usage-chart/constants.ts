import { formatAxisNumber } from '@/lib/utils/formatting'
import { ComputeChartConfig, ComputeChartType } from './types'

export const COMPUTE_CHART_CONFIGS: Record<
  ComputeChartType,
  ComputeChartConfig
> = {
  cost: {
    id: 'cost-usage',
    name: 'Cost',
    valueKey: 'total_cost',
    barColorVar: '--accent-positive-highlight',
    areaFromVar: '--graph-area-accent-positive-from',
    areaToVar: '--graph-area-accent-positive-to',
    yAxisScaleFactor: 1.2,
    yAxisFormatter: (value: number) => `$${formatAxisNumber(value)}`,
  },
  ram: {
    id: 'ram-usage',
    name: 'RAM Hours',
    valueKey: 'ram_gb_hours',
    barColorVar: '--bg-inverted',
    areaFromVar: '--graph-area-fg-from',
    areaToVar: '--graph-area-fg-to',
    yAxisScaleFactor: 1.2,
    yAxisFormatter: formatAxisNumber,
  },
  vcpu: {
    id: 'vcpu-usage',
    name: 'vCPU Hours',
    valueKey: 'vcpu_hours',
    barColorVar: '--bg-inverted',
    areaFromVar: '--graph-area-fg-from',
    areaToVar: '--graph-area-fg-to',
    yAxisScaleFactor: 1.2,
    yAxisFormatter: formatAxisNumber,
  },
  sandboxes: {
    id: 'sandboxes-usage',
    name: 'Sandboxes',
    valueKey: 'count',
    barColorVar: '--accent-main-highlight',
    areaFromVar: '--graph-area-accent-main-from',
    areaToVar: '--graph-area-accent-main-to',
    yAxisScaleFactor: 1.2,
    yAxisFormatter: formatAxisNumber,
  },
}
