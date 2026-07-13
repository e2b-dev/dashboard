import { describe, expect, it } from 'vitest'
import {
  cloudConnectionRetryDelayMs,
  shouldRetryCloudConnectionVerification,
} from '@/features/dashboard/byoc/cloud-connection-retry'

describe('BYOC cloud connection retry policy', () => {
  it('retries transient deployer verification three times at five-second intervals', () => {
    const message =
      'E2B cannot use the deployer service account yet. Retrying verification may succeed.'

    expect(cloudConnectionRetryDelayMs).toBe(5_000)
    expect(shouldRetryCloudConnectionVerification(0, message)).toBe(true)
    expect(shouldRetryCloudConnectionVerification(1, message)).toBe(true)
    expect(shouldRetryCloudConnectionVerification(2, message)).toBe(true)
    expect(shouldRetryCloudConnectionVerification(3, message)).toBe(false)
  })

  it('does not retry target mismatches or generic service failures', () => {
    expect(
      shouldRetryCloudConnectionVerification(
        0,
        'The BYOC deployer does not match this team.'
      )
    ).toBe(false)
    expect(
      shouldRetryCloudConnectionVerification(
        0,
        'BYOC deployments runner is temporarily unavailable.'
      )
    ).toBe(false)
    expect(shouldRetryCloudConnectionVerification(0, undefined)).toBe(false)
  })
})
