'use client'

import { cn } from '@/lib/utils'
import { AsciiBackgroundPattern } from '@/ui/patterns'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import type { ReactNode } from 'react'

interface SandboxInspectEmptyFrameProps {
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  className?: string
}

export default function SandboxInspectEmptyFrame({
  title,
  description,
  actions,
  className,
}: SandboxInspectEmptyFrameProps) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div className="text-fill-highlight pointer-events-none absolute -top-30 -right-100 left-0 flex overflow-hidden">
        <AsciiBackgroundPattern className="w-1/2 text-right" />
        <AsciiBackgroundPattern className="w-1/2 -scale-x-100" />
      </div>

      <div className="animate-fade-slide-in flex w-full items-center justify-center pt-24 max-sm:p-4">
        <Card className="border-stroke bg-bg-1/40 w-full max-w-md border backdrop-blur-lg">
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-fg-tertiary text-center">
            <p>{description}</p>
          </CardContent>
          {actions ? <CardFooter className="flex flex-col gap-4 pt-4">{actions}</CardFooter> : null}
        </Card>
      </div>
    </div>
  )
}
