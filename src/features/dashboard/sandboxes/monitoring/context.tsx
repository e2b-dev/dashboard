'use client'

import {
  TEAM_METRICS_INITIAL_RANGE_MS,
  TEAM_METRICS_POLLING_INTERVAL_MS,
} from '@/configs/intervals'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

interface TeamMetricsState {
  chartsStart: number
  chartsEnd: number
  realtimeSyncRange: number | null

  setChartsStart: React.Dispatch<React.SetStateAction<number>>
  setChartsEnd: React.Dispatch<React.SetStateAction<number>>
  setRealtimeSyncRange: React.Dispatch<React.SetStateAction<number | null>>
}

const TeamMetricsContext = createContext<TeamMetricsState | null>(null)

interface TeamMetricsProviderProps {
  children: ReactNode
}

export const TeamMetricsProvider = ({ children }: TeamMetricsProviderProps) => {
  const [chartsStart, setChartsStart] = useState<number>(
    Date.now() - TEAM_METRICS_INITIAL_RANGE_MS
  )
  const [chartsEnd, setChartsEnd] = useState<number>(Date.now())
  const [realtimeSyncRange, setRealtimeSyncRange] = useState<number | null>(
    TEAM_METRICS_INITIAL_RANGE_MS
  )

  // whether to sync charts in realtime or keep an explicit range
  useEffect(() => {
    if (!realtimeSyncRange) return

    setChartsStart(Date.now() - realtimeSyncRange)
    setChartsEnd(Date.now())

    const interval = setInterval(() => {
      setChartsStart(Date.now() - realtimeSyncRange)
      setChartsEnd(Date.now())
    }, TEAM_METRICS_POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [realtimeSyncRange])

  return (
    <TeamMetricsContext.Provider
      value={{
        chartsStart,
        chartsEnd,
        realtimeSyncRange,

        setRealtimeSyncRange,
        setChartsStart,
        setChartsEnd,
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
