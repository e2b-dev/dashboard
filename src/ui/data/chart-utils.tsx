import { formatAveragingPeriod } from '@/lib/utils/formatting'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import * as echarts from 'echarts'
import { renderToString } from 'react-dom/server'

/**
 * Creates a tooltip formatter function for single-value charts.
 * This is a generic utility that can be used by any chart component.
 */
export function createSingleValueTooltipFormatter({
  step,
  label,
  valueClassName = 'text-accent-info-highlight',
  descriptionClassName = 'text-fg-tertiary opacity-75',
  timestampClassName = 'text-fg-tertiary',
}: {
  step: number
  label: string | ((value: number) => string)
  valueClassName?: string
  descriptionClassName?: string
  timestampClassName?: string
}) {
  return (params: echarts.TooltipComponentFormatterCallbackParams) => {
    const paramsData = Array.isArray(params) ? params[0] : params
    if (!paramsData?.value) return ''

    const value = Array.isArray(paramsData.value)
      ? paramsData.value[1]
      : paramsData.value
    const timestamp = Array.isArray(paramsData.value)
      ? (paramsData.value[0] as string)
      : (paramsData.value as string)

    const displayLabel =
      typeof label === 'function' && typeof value === 'number'
        ? label(value)
        : label

    return renderToString(
      <SingleValueTooltip
        value={typeof value === 'number' ? value : 'n/a'}
        label={displayLabel as string}
        timestamp={timestamp}
        description={formatAveragingPeriod(step)}
        classNames={{
          value: valueClassName,
          description: descriptionClassName,
          timestamp: timestampClassName,
        }}
      />
    )
  }
}
