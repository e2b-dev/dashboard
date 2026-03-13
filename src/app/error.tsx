'use client'

import ErrorBoundary from '@/ui/error'

export default function AppError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <ErrorBoundary
      description="Sorry, something went wrong with the application."
      className="min-h-svh"
      error={error}
    />
  )
}
