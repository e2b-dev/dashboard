interface AttachTerminalWithRetryOptions<TResult> {
  canRetry: boolean
  isCurrent: () => boolean
  isRetryableError: (error: unknown) => boolean
  maxRetries: number
  onRetry: (delayMs: number) => void
  open: () => Promise<TResult | null>
  retryBaseDelayMs: number
  retryMaxDelayMs: number
  waitForRetry: (delayMs: number) => Promise<void>
}

export async function attachTerminalWithRetry<TResult>({
  canRetry,
  isCurrent,
  isRetryableError,
  maxRetries,
  onRetry,
  open,
  retryBaseDelayMs,
  retryMaxDelayMs,
  waitForRetry,
}: AttachTerminalWithRetryOptions<TResult>) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await open()
    } catch (error) {
      if (
        !canRetry ||
        attempt >= maxRetries ||
        !isCurrent() ||
        !isRetryableError(error)
      ) {
        throw error
      }

      const retryDelay = getRetryDelayMs({
        attempt,
        baseDelayMs: retryBaseDelayMs,
        maxDelayMs: retryMaxDelayMs,
      })
      onRetry(retryDelay)
      await waitForRetry(retryDelay)

      if (!isCurrent()) return null
    }
  }

  return null
}

function getRetryDelayMs({
  attempt,
  baseDelayMs,
  maxDelayMs,
}: {
  attempt: number
  baseDelayMs: number
  maxDelayMs: number
}) {
  return Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
}
