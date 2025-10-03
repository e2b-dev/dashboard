import { AreaProps } from 'recharts'
import { CategoricalChartProps } from 'recharts/types/chart/generateCategoricalChart'

export const chartConfig = {
  cost: {
    label: 'Cost',
    theme: {
      light: 'var(--accent-main-highlight )',
      dark: 'var(--accent-main-highlight )',
    },
  },
  vcpu: {
    label: 'vCPU Hours',
    theme: {
      light: 'var(--fg)',
      dark: 'var(--fg)',
    },
  },
  ram: {
    label: 'RAM Hours',
    theme: {
      light: 'var(--fg)',
      dark: 'var(--fg)',
    },
  },
}

export const commonChartProps: Partial<CategoricalChartProps> = {
  margin: { top: 10, right: 25, bottom: 10, left: 10 },
}

export const commonAreaProps: Partial<Omit<AreaProps, 'dataKey'>> = {
  type: 'monotone',
}

export const commonXAxisProps = {
  axisLine: false,
  tickLine: false,
  tickMargin: 12,
  fontSize: 12,
  minTickGap: 30,
  allowDataOverflow: true,
} as const

export const commonYAxisProps = {
  axisLine: false,
  tickLine: false,
  tickMargin: 12,
  fontSize: 12,
  width: 50,
  allowDataOverflow: true,
} as const

export const bigNumbersAxisTickFormatter = (value: number) => {
  if (value >= 1000000) {
    const millions = value / 1000000
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M'
      : millions.toFixed(1) + 'M'
  } else if (value >= 1000) {
    const thousands = value / 1000
    return thousands % 1 === 0
      ? thousands.toFixed(0) + 'K'
      : thousands.toFixed(1) + 'K'
  }
  return value.toLocaleString()
}
