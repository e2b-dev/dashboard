'use client'

import {
  PostHogErrorBoundary,
  type PostHogErrorBoundaryFallbackProps,
} from 'posthog-js/react'
import { ErrorIndicator } from '@/ui/error-indicator'
import Frame from '@/ui/frame'

// Not the shared ErrorBoundary: it calls captureException, which would
// double-report since PostHogErrorBoundary already reports the caught error.
function Fallback({ error }: PostHogErrorBoundaryFallbackProps) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Frame>
        <ErrorIndicator
          description="Sorry, something went wrong."
          message={message}
          className="border-none"
        />
      </Frame>
    </div>
  )
}

export function DashboardPostHogErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PostHogErrorBoundary fallback={Fallback}>{children}</PostHogErrorBoundary>
  )
}
