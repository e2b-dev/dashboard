import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { AlertIcon } from '@/ui/primitives/icons'
import { Skeleton } from '@/ui/primitives/skeleton'

interface ChartFallbackProps {
  title: string
  subtitle: string
  error?: string
}

export default function ChartFallback({
  title,
  subtitle,
  error,
}: ChartFallbackProps) {
  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">{title}</span>
      <div className="inline-flex items-end gap-3 mt-2">
        <Skeleton className="w-16 h-8 bg-bg-highlight" />
        <span className="label-tertiary">{subtitle}</span>
      </div>
      <ChartPlaceholder
        isLoading
        classNames={{
          container: 'self-center max-h-60 h-full',
        }}
        emptyContent={
          error ? (
            <div className="flex items-center gap-2">
              <AlertIcon className="w-4 h-4" />
              {error}
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
