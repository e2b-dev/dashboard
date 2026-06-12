'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { cn } from '@/lib/utils'
import { ErrorIndicator } from './error-indicator'
import Frame from './frame'

const GENERIC_ERROR_MESSAGE =
  "We're aware of the issue and are working to fix it as soon as possible."

export default function ErrorBoundary({
  error,
  description,
  className,
  hideFrame = false,
  onRetry,
}: {
  error: Error & { digest?: string }
  description?: string
  className?: string
  hideFrame?: boolean
  onRetry?: () => void
}) {
  useEffect(() => {
    l.error(
      {
        key: 'error_boundary',
        error: serializeErrorForLog(error),
      },
      `${error.message}`
    )

    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.captureException(error)
    }
  }, [error])

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center',
        className
      )}
    >
      {hideFrame ? (
        <ErrorIndicator
          description={description}
          message={GENERIC_ERROR_MESSAGE}
          className="border-none"
          onRetry={onRetry}
        />
      ) : (
        <Frame>
          <ErrorIndicator
            description={description}
            message={error.message}
            className="border-none"
            onRetry={onRetry}
          />
        </Frame>
      )}
    </div>
  )
}

export function CatchErrorBoundary({
  children,
  classNames,
  hideFrame = false,
}: {
  children: React.ReactNode
  classNames?: {
    errorBoundary?: string
    wrapper?: string
  }
  hideFrame?: boolean
}) {
  return (
    <ReactErrorBoundary
      fallbackRender={({ error }) => {
        if (classNames?.wrapper) {
          return (
            <div className={classNames?.wrapper}>
              <ErrorBoundary
                className={classNames?.errorBoundary}
                error={error}
                hideFrame={hideFrame}
              />
            </div>
          )
        }

        return (
          <ErrorBoundary
            className={classNames?.errorBoundary}
            error={error}
            hideFrame={hideFrame}
          />
        )
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}
