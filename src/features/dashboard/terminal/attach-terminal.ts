interface AttachTerminalWithRetryOptions<TResult> {
  canRetry: boolean
  isCurrent: () => boolean
  isRetryableError: (error: unknown) => boolean
  onRetry: (delayMs: number) => void
  open: () => Promise<TResult | null>
  retryDelaysMs: readonly number[]
  waitForRetry: (delayMs: number) => Promise<void>
}

export async function attachTerminalWithRetry<TResult>({
  canRetry,
  isCurrent,
  isRetryableError,
  onRetry,
  open,
  retryDelaysMs,
  waitForRetry,
}: AttachTerminalWithRetryOptions<TResult>) {
  let attachAttempt = 0

  while (true) {
    try {
      return await open()
    } catch (error) {
      const retryDelay = retryDelaysMs[attachAttempt]
      if (
        !canRetry ||
        retryDelay == null ||
        !isCurrent() ||
        !isRetryableError(error)
      ) {
        throw error
      }

      attachAttempt += 1
      onRetry(retryDelay)
      await waitForRetry(retryDelay)

      if (!isCurrent()) return null
    }
  }
}
