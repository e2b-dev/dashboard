import { cn } from '@/lib/utils'
import { GridPattern } from '@/ui/grid-pattern'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100svh] flex-col">
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        strokeDasharray={'4 2'}
        className={cn(
          '[mask-image:radial-gradient(800px_400px_at_center,white,transparent)]',
          'z-10'
        )}
        gradientFrom="var(--accent-main-highlight )"
        gradientVia="var(--bg-highlight)"
        gradientTo="var(--fill-highlight)"
        gradientDegrees={90}
      />
      <div className="z-10 flex h-full w-full items-center justify-center px-4">
        <div className="h-fit border bg-bg w-full max-w-96 p-6">{children}</div>
      </div>
    </div>
  )
}
