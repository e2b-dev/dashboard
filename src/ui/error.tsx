'use client'

import { useEffect } from 'react'
import { ErrorIndicator } from './error-indicator'
import { logError } from '@/lib/clients/logger'
import Frame from './frame'
import { cn } from '@/lib/utils'
import * as Sentry from '@sentry/nextjs'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

export default function ErrorBoundary({
  error,
  description,
  className,
  hideFrame = false,
}: {
  error: Error & { digest?: string }
  description?: string
  className?: string
  hideFrame?: boolean
}) {
  useEffect(() => {
    if (Sentry.isInitialized()) {
      Sentry.captureException(error, {
        level: 'fatal',
        tags: {
          component: 'ErrorBoundary',
        },
      })
    } else {
      logError('Error boundary caught:', error)
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
          message={error.message}
          className="border-none"
        />
      ) : (
        <Frame>
          <ErrorIndicator
            description={description}
            message={error.message}
            className="border-none"
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
