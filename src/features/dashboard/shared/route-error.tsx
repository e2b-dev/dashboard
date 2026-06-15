'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import ErrorBoundary from '@/ui/error'

interface DashboardRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function DashboardRouteError({
  error,
  reset,
}: DashboardRouteErrorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  )

  const previousRouteKeyRef = useRef(routeKey)

  useEffect(() => {
    if (previousRouteKeyRef.current !== routeKey) {
      previousRouteKeyRef.current = routeKey
      reset()
    }
  }, [routeKey, reset])

  return (
    <ErrorBoundary
      description="Sorry, something went wrong with this page."
      className="min-h-svh"
      error={error}
      onRetry={() => {
        router.refresh()
        reset()
      }}
    />
  )
}
