import type { EChartsOption } from 'echarts'

export const defaultLineChartOption: EChartsOption = {
  backgroundColor: 'transparent',
  grid: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // toolbox has to be enabled for programmatic data zoom to work -
  // we render it invisible and keep the feature enabled
  toolbox: {
    id: 'toolbox',
    show: true,
    iconStyle: {
      opacity: 0,
    },
    showTitle: false,
    feature: {
      dataZoom: {
        yAxisIndex: 'none',
      },
    },
  },
  tooltip: { show: false },
  animation: false,
  xAxis: {
    type: 'category', // runtime may override to 'time'
    axisLine: { show: true },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: true },
    axisPointer: {
      show: true,
      type: 'line',
      label: {
        show: true,
      },
    },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: true },
    axisLabel: { show: true },
    axisPointer: {
      show: true,
      type: 'line',
      label: {
        show: true,
      },
    },
  },
  series: [],
}
