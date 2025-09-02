'use client'

import * as echarts from 'echarts'
import { useCallback, useEffect, useRef } from 'react'

export function useConnectedCharts(group: string) {
  const chartsRef = useRef<echarts.ECharts[]>([])

  const registerChart = useCallback(
    (chart: echarts.ECharts) => {
      if (!chartsRef.current.includes(chart)) {
        chartsRef.current.push(chart)
        chart.group = group

        if (chartsRef.current.length > 1) {
          echarts.connect(group)
        }
      }
    },
    [group]
  )

  useEffect(() => {
    return () => {
      if (chartsRef.current.length > 0) {
        echarts.disconnect(group)
        chartsRef.current = []
      }
    }
  }, [group])

  return { registerChart }
}
