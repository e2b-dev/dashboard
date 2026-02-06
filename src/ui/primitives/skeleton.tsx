import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-bg-1 animate-pulse border border-stroke/60', className)}
      {...props}
    />
  )
}

export { Skeleton }
