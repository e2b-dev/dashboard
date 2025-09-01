'use client'

import { l } from '@/lib/clients/logger/logger'
import { PollingButton } from '@/ui/polling-button'
import { useCallback, useState } from 'react'
import { serializeError } from 'serialize-error'
import { useSandboxContext } from '../context'

const pollingIntervals = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

type PollingInterval = (typeof pollingIntervals)[number]['value']

interface RefreshControlProps {
  className?: string
  initialPollingInterval?: PollingInterval
}

export default function RefreshControl({
  className,
  initialPollingInterval,
}: RefreshControlProps) {
  const [pollingInterval, setPollingInterval] = useState<PollingInterval>(
    initialPollingInterval ?? pollingIntervals[2]!.value
  )

  const { refetchSandboxInfo, isSandboxInfoLoading } = useSandboxContext()

  const handleIntervalChange = useCallback(
    async (interval: PollingInterval) => {
      setPollingInterval(interval)
      try {
        await fetch('/api/sandbox/details/polling', {
          method: 'POST',
          body: JSON.stringify({ interval }),
        })
      } catch (error) {
        l.error({
          key: 'sandbox_inspect_refresh:save_polling_interval_failed',
          message:
            error instanceof Error ? error.message : 'Failed to save root path',
          error: serializeError(error),
        })
      }
    },
    []
  )

  return (
    <PollingButton
      intervals={pollingIntervals}
      pollingInterval={pollingInterval}
      onIntervalChange={handleIntervalChange}
      isPolling={isSandboxInfoLoading}
      onRefresh={refetchSandboxInfo}
      className={className}
    />
  )
}
