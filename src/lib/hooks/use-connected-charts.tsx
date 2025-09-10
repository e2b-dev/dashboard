'use client'

import * as echarts from 'echarts'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface ChartRegistryContextType {
  registerChart: (chart: echarts.ECharts) => void
  unregisterChart: (chart: echarts.ECharts) => void
}

const ChartRegistryContext = createContext<ChartRegistryContextType | null>(
  null
)

export function ChartRegistryProvider({
  children,
  group,
}: {
  children: ReactNode
  group: string
}) {
  const [charts, setCharts] = useState<echarts.ECharts[]>([])
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  // on mount, disconnect any existing charts in this group to start fresh
  useEffect(() => {
    if (!mountedRef.current) {
      echarts.disconnect(group)
      mountedRef.current = true
    }
  }, [group])

  const connectCharts = useCallback(
    (chartsToConnect: echarts.ECharts[]) => {
      if (chartsToConnect.length > 1) {
        // always disconnect first to ensure clean state
        echarts.disconnect(group)

        // set group on all charts before connecting
        chartsToConnect.forEach((chart) => {
          chart.group = group
        })

        // connect using array of chart instances
        echarts.connect(chartsToConnect)
      }
    },
    [group]
  )

  const registerChart = useCallback(
    (chart: echarts.ECharts) => {
      setCharts((prevCharts) => {
        // check if chart is already in the list
        if (prevCharts.includes(chart)) {
          return prevCharts
        }

        const newCharts = [...prevCharts, chart]

        // set group immediately
        chart.group = group

        // clear existing timeout
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current)
        }

        // batch chart registrations with a small delay
        // this ensures all charts register during initial render before connecting
        batchTimeoutRef.current = setTimeout(() => {
          // use the callback form to get latest state
          setCharts((latestCharts) => {
            connectCharts(latestCharts)
            return latestCharts
          })
          batchTimeoutRef.current = null
        }, 100)

        return newCharts
      })
    },
    [group, connectCharts]
  )

  const unregisterChart = useCallback(
    (chart: echarts.ECharts) => {
      setCharts((prevCharts) => {
        const newCharts = prevCharts.filter((c) => c !== chart)

        // reconnect remaining charts if we have more than one
        if (newCharts.length > 1) {
          connectCharts(newCharts)
        } else if (newCharts.length <= 1) {
          // disconnect if we have 1 or 0 charts
          echarts.disconnect(group)
        }

        return newCharts
      })
    },
    [group, connectCharts]
  )

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
      echarts.disconnect(group)
    }
  }, [group])

  return (
    <ChartRegistryContext.Provider value={{ registerChart, unregisterChart }}>
      {children}
    </ChartRegistryContext.Provider>
  )
}

export function useChartRegistry() {
  const context = useContext(ChartRegistryContext)
  if (!context) {
    throw new Error(
      'useChartRegistry must be used within ChartRegistryProvider'
    )
  }
  return context
}
