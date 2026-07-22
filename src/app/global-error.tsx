'use client'

import ErrorBoundary from '@/ui/error'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <ErrorBoundary
      description="Sorry, something went wrong with the application."
      error={error}
    />
  )
}
