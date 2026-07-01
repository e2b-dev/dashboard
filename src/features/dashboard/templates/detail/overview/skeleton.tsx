import { Skeleton } from '@/ui/primitives/skeleton'
import { OverviewSection } from './section'

export function TemplateOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <OverviewSection label="Template" divider={false}>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <MetaCellSkeleton />
          <MetaCellSkeleton />
          <MetaCellSkeleton className="ml-auto items-end" />
        </div>
      </OverviewSection>

      <OverviewSection label="Latest build">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-5 w-80 mt-2 max-w-full" />
      </OverviewSection>

      <OverviewSection label="Sandboxes started">
        <Skeleton className="h-8 w-20" />
      </OverviewSection>
    </div>
  )
}

function MetaCellSkeleton({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}
