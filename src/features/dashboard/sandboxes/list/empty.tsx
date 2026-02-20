import { cn } from '@/lib/utils'
import { AsciiBackgroundPattern } from '@/ui/patterns'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import type { ReactNode } from 'react'

interface SandboxesListEmptyProps {
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  className?: string
}

export default function SandboxesListEmpty({
  title,
  description,
  actions,
  className,
}: SandboxesListEmptyProps) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div className="text-fill-highlight pointer-events-none absolute top-0 -left-250 flex justify-start overflow-hidden">
        <AsciiBackgroundPattern className="w-auto text-right!" />
        <AsciiBackgroundPattern className="w-auto text-right! -scale-x-100" />
      </div>

      <div className="animate-fade-slide-in flex w-full items-center justify-center pt-24 max-sm:p-4">
        <Card className="border-stroke bg-bg-1/40 w-full max-w-md border backdrop-blur-lg">
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {actions ? <CardFooter className="flex flex-col gap-4 pt-4">{actions}</CardFooter> : null}
        </Card>
      </div>
    </div>
  )
}
