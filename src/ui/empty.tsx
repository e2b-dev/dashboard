import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './primitives/card'

interface EmptyIndicatorProps {
  title?: ReactNode
  description?: ReactNode
  message?: ReactNode
  className?: string
}

export function EmptyIndicator({
  title = 'No Data',
  description = 'Nothing to show here yet',
  message,
  className,
}: EmptyIndicatorProps) {
  return (
    <Card variant="slate" className={cn('w-full max-w-md', className)}>
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      {message && (
        <CardContent className="mx-auto max-w-md text-center text-fg-tertiary">
          {message}
        </CardContent>
      )}
    </Card>
  )
}

interface EmptyProps {
  className?: string
  title?: ReactNode
  description?: ReactNode
  message?: ReactNode
}

export default function Empty({
  className,
  title,
  description,
  message,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center',
        className
      )}
    >
      <EmptyIndicator
        title={title}
        description={description}
        message={message}
      />
    </div>
  )
}
