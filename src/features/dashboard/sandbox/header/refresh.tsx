'use client'

import { useCallback, useTransition } from 'react'
import { PollingButton, PollingButtonProps } from '@/ui/polling-button'
import { useState } from 'react'
import { revalidateSandboxDetailsLayout } from '@/server/sandboxes/sandbox-actions'
import { useParams, useRouter } from 'next/navigation'

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
  const [isPending, startTransition] = useTransition()
  const { teamIdOrSlug, sandboxId } = useParams()

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      await revalidateSandboxDetailsLayout(
        teamIdOrSlug as string,
        sandboxId as string
      )
    })
  }, [teamIdOrSlug, sandboxId])

  const handleIntervalChange = useCallback(
    async (interval: PollingInterval) => {
      setPollingInterval(interval)
      await fetch('/api/sandbox/details/polling', {
        method: 'POST',
        body: JSON.stringify({ interval }),
      })
    },
    []
  )

  return (
    <PollingButton
      intervals={pollingIntervals}
      pollingInterval={pollingInterval}
      onIntervalChange={handleIntervalChange}
      isPolling={isPending}
      onRefresh={handleRefresh}
      className={className}
    />
  )
}
