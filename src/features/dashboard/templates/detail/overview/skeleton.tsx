import { Skeleton } from '@/ui/primitives/skeleton'
import { OverviewSection } from './section'

export function TemplateOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <OverviewSection label="Template" divider={false}>
        <Skeleton className="h-8 w-[28rem] max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </OverviewSection>

      <OverviewSection label="Latest build">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-x-8 gap-y-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <Skeleton className="h-5 w-80 mt-2 max-w-full" />
      </OverviewSection>

      <OverviewSection label="Sandboxes started">
        <Skeleton className="h-8 w-20" />
      </OverviewSection>
    </div>
  )
}
