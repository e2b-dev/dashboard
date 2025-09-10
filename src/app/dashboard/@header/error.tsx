'use client'

import { l } from '@/lib/clients/logger/logger'
import { useEffect } from 'react'
import { serializeError } from 'serialize-error'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
}

export default function ErrorBoundary({ error }: ErrorBoundaryProps) {
  // we only want to log the error once
  useEffect(() => {
    l.error(
      {
        key: 'header_slot_error_boundary',
        error: serializeError(error),
      },
      `${error.message}`
    )
  }, [error])

  return <></>
}
