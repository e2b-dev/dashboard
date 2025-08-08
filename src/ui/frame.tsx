import { cn } from '@/lib/utils'
import Scanline from './scanline'

interface FrameProps {
  children: React.ReactNode
  classNames?: {
    wrapper?: string
    frame?: string
  }
}

export default function Frame({ children, classNames }: FrameProps) {
  return (
    <div
      className={cn('relative flex h-fit w-fit pb-1.5', classNames?.wrapper)}
    >
      <div className="absolute inset-x-[3px] top-1 bottom-0 h-auto w-auto  border">
        <Scanline />
      </div>
      <div
        className={cn(
          'bg-bg relative w-full  border shadow-md',
          classNames?.frame
        )}
      >
        {children}
      </div>
    </div>
  )
}
