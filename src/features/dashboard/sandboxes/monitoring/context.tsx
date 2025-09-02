'use client'

import { useConnectedCharts } from '@/lib/hooks/use-connected-charts'
import {
  parseTimeframeFromSearchParams,
  ResolvedTimeframe,
  resolveTimeframe,
  TIME_RANGES,
  TimeframeState,
  timeframeToSearchParams,
  TimeRangeKey,
} from '@/lib/utils/timeframe'
import * as echarts from 'echarts'
import { useSearchParams } from 'next/navigation'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

interface TeamMetricsState {
  timeframe: ResolvedTimeframe

  setLiveMode: (range: number) => void
  setStaticMode: (start: number, end: number) => void
  setTimeRange: (range: TimeRangeKey) => void

  registerChart: (chart: echarts.ECharts) => void
}

const TeamMetricsContext = createContext<TeamMetricsState | null>(null)

interface TeamMetricsProviderProps {
  children: ReactNode
}

export const TeamMetricsProvider = ({ children }: TeamMetricsProviderProps) => {
  const searchParams = useSearchParams()

  const [timeframeState, setTimeframeState] = useState<TimeframeState>(() => {
    return parseTimeframeFromSearchParams({
      charts_start: searchParams.get('charts_start') || undefined,
      charts_end: searchParams.get('charts_end') || undefined,
    })
  })

  const timeframe = resolveTimeframe(timeframeState)

  useEffect(() => {
    setTimeframeState(
      parseTimeframeFromSearchParams({
        charts_start: searchParams.get('charts_start') || undefined,
        charts_end: searchParams.get('charts_end') || undefined,
      })
    )
  }, [searchParams])

  const { registerChart } = useConnectedCharts('sandboxes-monitoring')

  const updateUrl = useCallback(
    (newState: TimeframeState) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      const timeframeParams = timeframeToSearchParams(newState)

      newSearchParams.delete('charts_start')
      newSearchParams.delete('charts_end')

      Object.entries(timeframeParams).forEach(([key, value]) => {
        newSearchParams.set(key, value)
      })

      const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`

      window.history.pushState(null, '', newUrl)
    },
    [searchParams]
  )

  const setLiveMode = useCallback(
    (range: number) => {
      const newState: TimeframeState = { mode: 'live', range }
      setTimeframeState(newState)
      updateUrl(newState)
    },
    [updateUrl]
  )

  const setStaticMode = useCallback(
    (start: number, end: number) => {
      const newState: TimeframeState = {
        mode: 'static',
        start: Math.floor(start),
        end: Math.floor(end),
      }
      setTimeframeState(newState)
      updateUrl(newState)
    },
    [updateUrl]
  )

  const setTimeRange = useCallback(
    (range: TimeRangeKey) => {
      setLiveMode(TIME_RANGES[range])
    },
    [setLiveMode]
  )

  return (
    <TeamMetricsContext.Provider
      value={{
        timeframe,
        setLiveMode,
        setStaticMode,
        setTimeRange,
        registerChart,
      }}
    >
      {children}
    </TeamMetricsContext.Provider>
  )
}

export default TeamMetricsContext

export const useTeamMetrics = () => {
  const context = useContext(TeamMetricsContext)

  if (!context) {
    throw new Error('useTeamMetrics must be used within a TeamMetricsProvider')
  }

  return context
}
