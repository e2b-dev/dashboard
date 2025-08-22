"use client"

import { TEAM_METRICS_INITIAL_RANGES } from '@/configs/intervals'
import { createContext, useContext, ReactNode, useMemo, useState } from 'react'

interface TeamMetricsState {
  concurrentSandboxesStart: number
  concurrentSandboxesEnd: number

  startedSandboxesStart: number
  startedSandboxesEnd: number
}

const TeamMetricsContext = createContext<TeamMetricsState | null>(null)

interface TeamMetricsProviderProps {
  children: ReactNode
}

export const TeamMetricsProvider = ({ children }: TeamMetricsProviderProps) => {

  const [concurrentSandboxesStart, setConcurrentSandboxesStart] = useState<number>(Date.now() - TEAM_METRICS_INITIAL_RANGES.concurrent)
  const [concurrentSandboxesEnd, setConcurrentSandboxesEnd] = useState<number>(Date.now())

  const [startedSandboxesStart, setStartedSandboxesStart] = useState<number>(Date.now() - TEAM_METRICS_INITIAL_RANGES.started)
  const [startedSandboxesEnd, setStartedSandboxesEnd] = useState<number>(Date.now())

  const value = useMemo(() => ({
    concurrentSandboxesStart,
    concurrentSandboxesEnd,

    startedSandboxesStart,
    startedSandboxesEnd,

    setConcurrentSandboxesStart,
    setConcurrentSandboxesEnd,

    setStartedSandboxesStart,
    setStartedSandboxesEnd,
  }), [concurrentSandboxesStart, concurrentSandboxesEnd, startedSandboxesStart, startedSandboxesEnd])

  return (
    <TeamMetricsContext.Provider value={value}>
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
