import { Skeleton } from "@/ui/primitives/skeleton"
import { ChartPlaceholder } from '@/ui/chart-placeholder'

interface ChartFallbackProps {
  title: string
  subtitle: string
}

export default function ChartFallback({ title, subtitle }: ChartFallbackProps) {
  return <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
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
    />
  </div>
}
