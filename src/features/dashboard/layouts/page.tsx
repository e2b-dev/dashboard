import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageProps {
  children: ReactNode
  className?: string
}

export const Page = ({ children, className }: PageProps) => (
  <div className={cn('mx-auto w-full max-w-[900px] px-3 md:px-0', className)}>
    {children}
  </div>
)
