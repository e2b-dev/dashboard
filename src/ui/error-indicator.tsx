'use client'

import { cn } from '@/lib/utils'
import { RefreshCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from './primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './primitives/card'

interface ErrorIndicatorProps {
  title?: string
  description?: string
  message?: string
  className?: string
  children?: React.ReactNode
}

export function ErrorIndicator({
  title = 'Error',
  description = 'Something went wrong!',
  message,
  className,
  children,
}: ErrorIndicatorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Card className={cn('bg-bg w-full max-w-md border', className)}>
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {message && (
        <CardContent className="text-fg-tertiary mx-auto max-w-md pb-0 text-center">
          <p>{message}</p>
        </CardContent>
      )}
      {children && (
        <CardContent className="mx-auto max-w-md pb-0 text-center">
          {children}
        </CardContent>
      )}
      <CardFooter className="px-auto flex flex-col gap-4 py-4">
        <Button
          variant="outline"
          onClick={() => startTransition(() => router.refresh())}
          className="w-full max-w-md gap-2"
        >
          <RefreshCcw
            className={`text-fg-tertiary h-4 w-4 duration-500 ease-in-out ${isPending ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  )
}
