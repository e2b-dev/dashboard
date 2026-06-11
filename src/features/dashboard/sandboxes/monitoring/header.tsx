import { Suspense } from 'react'
import { SemiLiveBadge } from '@/ui/live'
import { Skeleton } from '@/ui/primitives/skeleton'
import {
  ConcurrentSandboxesClient,
  MaxConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'

interface MonitoringContentParams {
  teamSlug: string
}

function BaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 max-md:not-last:border-b md:not-last:border-r flex-1 w-full flex flex-col justify-center items-center gap-2 md:gap-3 relative min-h-[100px] md:h-45">
      {children}
    </div>
  )
}

function BaseSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-fg-tertiary prose-label uppercase text-center">
      {children}
    </span>
  )
}

export default function SandboxesMonitoringHeader(_props: {
  params: Promise<MonitoringContentParams>
}) {
  return (
    <div className="flex md:flex-row flex-col items-center border-b w-full max-md:py-2">
      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <ConcurrentSandboxes />
        </Suspense>
        <BaseSubtitle>
          Concurrent Sandboxes <br className="max-md:hidden" />
          <span className="max-md:hidden">(5-sec avg)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <SandboxesStartRate />
        </Suspense>
        <BaseSubtitle>
          Start Rate per Second <br className="max-md:hidden" />
          <span className="max-md:hidden">(5-sec avg)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <MaxConcurrentSandboxes />
        </Suspense>
        <BaseSubtitle>
          Peak Concurrent Sandboxes
          <br className="max-md:hidden" />
          <span className="max-md:hidden">(30-day max)</span>
        </BaseSubtitle>
      </BaseCard>
    </div>
  )
}
// Components

export const ConcurrentSandboxes = () => {
  return <ConcurrentSandboxesClient />
}

export const SandboxesStartRate = () => {
  return <SandboxesStartRateClient />
}

export const MaxConcurrentSandboxes = () => {
  return <MaxConcurrentSandboxesClient />
}
