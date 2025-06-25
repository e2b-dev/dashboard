'use client'

import { useCallback, useTransition } from 'react'
import { PollingButton } from '@/ui/polling-button'
import type { PollingInterval } from '@/types/dashboard.types'
import { useState } from 'react'
import { revalidateSandboxDetailsLayout } from '@/server/sandboxes/sandbox-actions'
import { useParams, useRouter } from 'next/navigation'

interface RefreshControlProps {
  className?: string
}

export default function RefreshControl({ className }: RefreshControlProps) {
  const [pollingInterval, setPollingInterval] = useState<PollingInterval>(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { teamIdOrSlug, sandboxId } = useParams()

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      await revalidateSandboxDetailsLayout(
        teamIdOrSlug as string,
        sandboxId as string
      )
      router.refresh()
    })
  }, [router, teamIdOrSlug, sandboxId])

  return (
    <PollingButton
      pollingInterval={pollingInterval}
      onIntervalChange={setPollingInterval}
      isPolling={isPending}
      onRefresh={handleRefresh}
      className={className}
    />
  )
}
