import { cn } from '@/lib/utils'

interface ScanlineProps {
  className?: string
}

export default function Scanline({ className }: ScanlineProps) {
  return (
    <div
      className={cn(
        'text-stroke/50 absolute inset-0 h-full w-full overflow-hidden',
        className
      )}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <pattern
            id="scanlines"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="5"
              x2="5"
              y2="0"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scanlines)" />
      </svg>
    </div>
  )
}
