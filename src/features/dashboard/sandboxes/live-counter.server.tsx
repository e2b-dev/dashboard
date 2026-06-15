import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/ui/primitives/skeleton'
import { LiveSandboxCounterClient } from './live-counter.client'

interface LiveSandboxCounterServerProps {
  params: Promise<{ teamSlug: string }>
  className?: string
}

export async function LiveSandboxCounterServer({
  params,
  className,
}: LiveSandboxCounterServerProps) {
  return (
    <Suspense
      fallback={
        <Skeleton className={cn(className, 'border h-[42px] w-[250px]')} />
      }
    >
      <LiveSandboxCounterResolver params={params} className={className} />
    </Suspense>
  )
}

async function LiveSandboxCounterResolver({
  params,
  className,
}: LiveSandboxCounterServerProps) {
  await params

  return <LiveSandboxCounterClient className={className} />
}
