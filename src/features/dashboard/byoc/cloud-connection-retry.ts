export const cloudConnectionRetryDelayMs = 5_000
export const cloudConnectionRetryLimit = 24

export function shouldRetryCloudConnectionVerification(
  failureCount: number,
  message: string | undefined
) {
  return (
    failureCount < cloudConnectionRetryLimit &&
    message?.includes('E2B cannot use the deployer service account yet') ===
      true
  )
}
