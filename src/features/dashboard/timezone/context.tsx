'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { type Timezone, TimezoneSchema } from './schema'
import { getBrowserTimezone, parseTimezone } from './utils'

const DEFAULT_TIMEZONE = TimezoneSchema.parse('UTC')

interface TimezoneContextValue {
  timezone: Timezone
  setTimezone: (timezone: Timezone) => Promise<boolean>
}

interface TimezoneProviderProps {
  children: ReactNode
  initialTimezone: string | null
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null)

const persistTimezone = async (timezone: Timezone): Promise<boolean> => {
  try {
    const response = await fetch('/api/timezone/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezone }),
    })

    return response.ok
  } catch {
    return false
  }
}

export const TimezoneProvider = ({
  children,
  initialTimezone,
}: TimezoneProviderProps) => {
  const parsedInitialTimezone = useMemo(
    () => parseTimezone(initialTimezone),
    [initialTimezone]
  )
  const [timezone, setTimezoneState] = useState(
    parsedInitialTimezone ?? DEFAULT_TIMEZONE
  )

  useEffect(() => {
    if (parsedInitialTimezone) return

    const browserTimezone = getBrowserTimezone()
    setTimezoneState(browserTimezone)
    void persistTimezone(browserTimezone)
  }, [parsedInitialTimezone])

  const setTimezone = useCallback(
    async (nextTimezone: Timezone) => {
      const previousTimezone = timezone
      setTimezoneState(nextTimezone)

      const didPersist = await persistTimezone(nextTimezone)
      if (!didPersist) {
        setTimezoneState(previousTimezone)
        return false
      }

      return true
    },
    [timezone]
  )

  const value = useMemo(
    () => ({
      timezone,
      setTimezone,
    }),
    [setTimezone, timezone]
  )

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export const useTimezone = () => {
  const context = useContext(TimezoneContext)
  if (!context) {
    throw new Error('useTimezone must be used within TimezoneProvider')
  }

  return context
}
