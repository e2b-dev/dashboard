import { describe, expect, it } from 'vitest'
import { appEnvSchema } from '@/lib/env'

describe('dashboard environment validation', () => {
  it('accepts the public runtime names without requiring a legacy domain', () => {
    expect(
      appEnvSchema.safeParse({
        PUBLIC_E2B_DOMAIN: 'cluster.example',
        PUBLIC_SANDBOX_URL: 'https://sandbox.cluster.example',
      }).success
    ).toBe(true)
  })

  it('keeps legacy build configuration valid', () => {
    expect(
      appEnvSchema.safeParse({
        NEXT_PUBLIC_E2B_DOMAIN: 'cluster.example',
        E2B_SANDBOX_URL: 'https://sandbox.cluster.example',
      }).success
    ).toBe(true)
  })

  it('requires a nonempty domain through either name', () => {
    expect(appEnvSchema.safeParse({}).success).toBe(false)
    expect(
      appEnvSchema.safeParse({
        PUBLIC_E2B_DOMAIN: ' ',
        NEXT_PUBLIC_E2B_DOMAIN: '',
      }).success
    ).toBe(false)
  })
})
