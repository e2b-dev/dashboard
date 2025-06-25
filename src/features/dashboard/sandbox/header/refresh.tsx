'use client'

import { useTransition } from 'react'
import { PollingButton } from '@/ui/polling-button'
import type { PollingInterval } from '@/types/dashboard.types'
import { useState } from 'react'
import { revalidateSandboxDetailsLayout } from '@/server/sandboxes/sandbox-actions'
import { useRouter } from 'next/navigation'

interface RefreshControlProps {
  className?: string
}

export default function RefreshControl({ className }: RefreshControlProps) {
  const [pollingInterval, setPollingInterval] = useState<PollingInterval>(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRefresh = () => {
    startTransition(async () => {
      await revalidateSandboxDetailsLayout()
      router.refresh()
    })
  }

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
