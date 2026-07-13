export const cloudConnectionRetryDelayMs = 5_000

export function shouldRetryCloudConnectionVerification(
  failureCount: number,
  message: string | undefined
) {
  return (
    failureCount < 3 &&
    message?.includes('E2B cannot use the deployer service account yet') ===
      true
  )
}
