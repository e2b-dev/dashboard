import { Skeleton } from '@/ui/primitives/skeleton'

const headerItemSkeletonClassNames = [
  'h-4 w-20',
  'h-4 w-64',
  'h-4 w-14',
  'h-4 w-36',
  'h-4 w-36',
]

export const WebhookDetailHeaderFallback = () => (
  <header className="bg-bg relative z-30 w-full p-3 md:p-6">
    <div className="flex flex-wrap gap-6 md:gap-10">
      {headerItemSkeletonClassNames.map((className, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className={className} />
        </div>
      ))}
    </div>
  </header>
)

export const WebhookDetailContentFallback = () => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="flex p-3 md:p-6">
      <Skeleton className="h-9 w-40" />
    </div>

    <div className="grid border-y border-stroke md:grid-cols-4 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
      {Array.from({ length: 4 }).map((_, index) => (
        <section key={index} className="p-4 md:p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-20" />
          <Skeleton className="mt-3 h-4 w-32" />
        </section>
      ))}
    </div>

    <div className="grid min-h-[360px] md:flex-1 md:grid-cols-2 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
      {Array.from({ length: 2 }).map((_, index) => (
        <section key={index} className="flex min-w-0 flex-col p-3 md:p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 min-h-[260px] flex-1" />
        </section>
      ))}
    </div>
  </div>
)
