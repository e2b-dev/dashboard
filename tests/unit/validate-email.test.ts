import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KV_KEYS } from '@/configs/keys'
import { shouldWarnAboutAlternateEmail } from '@/core/server/functions/auth/validate-email'

const { getKvValue, setKvValue, warn } = vi.hoisted(() => ({
  getKvValue: vi.fn(),
  setKvValue: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/core/shared/clients/kv', () => ({
  getKvValue,
  setKvValue,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    warn,
    error: vi.fn(),
  },
  serializeErrorForLog: vi.fn((error) => error),
}))

const alternateEmailValidation = {
  address: 'user@example.com',
  status: 'valid',
  sub_status: 'alternate',
  free_email: false,
  account: 'user',
  domain: 'example.com',
  mx_found: true,
  did_you_mean: null,
  domain_age_days: null,
  active_in_days: null,
  smtp_provider: null,
  mx_record: null,
  firstname: null,
  lastname: null,
  gender: null,
  country: null,
  region: null,
  city: null,
  zipcode: null,
  processed_at: '2026-05-13',
}

describe('shouldWarnAboutAlternateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps warn-once behavior when KV is available', async () => {
    getKvValue.mockResolvedValue({
      ok: true,
      configured: true,
      value: null,
    })
    setKvValue.mockResolvedValue({
      ok: true,
      configured: true,
      value: 'OK',
    })

    await expect(
      shouldWarnAboutAlternateEmail(alternateEmailValidation)
    ).resolves.toBe(true)

    expect(getKvValue).toHaveBeenCalledWith(
      KV_KEYS.WARNED_ALTERNATE_EMAIL('user@example.com')
    )
    expect(setKvValue).toHaveBeenCalledWith(
      KV_KEYS.WARNED_ALTERNATE_EMAIL('user@example.com'),
      true
    )
  })

  it('does not warn again when KV has already recorded the email', async () => {
    getKvValue.mockResolvedValue({
      ok: true,
      configured: true,
      value: true,
    })

    await expect(
      shouldWarnAboutAlternateEmail(alternateEmailValidation)
    ).resolves.toBe(false)

    expect(setKvValue).not.toHaveBeenCalled()
  })

  it('allows sign-up flow to continue when KV is not configured', async () => {
    getKvValue.mockResolvedValue({
      ok: false,
      configured: false,
      reason: 'not_configured',
    })

    await expect(
      shouldWarnAboutAlternateEmail(alternateEmailValidation)
    ).resolves.toBe(false)

    expect(warn).toHaveBeenCalled()
    expect(setKvValue).not.toHaveBeenCalled()
  })

  it('allows sign-up flow to continue when KV read fails', async () => {
    getKvValue.mockResolvedValue({
      ok: false,
      configured: true,
      reason: 'error',
      error: new Error('kv unavailable'),
    })

    await expect(
      shouldWarnAboutAlternateEmail(alternateEmailValidation)
    ).resolves.toBe(false)

    expect(warn).toHaveBeenCalled()
    expect(setKvValue).not.toHaveBeenCalled()
  })

  it('allows sign-up flow to continue when KV cannot persist warning state', async () => {
    getKvValue.mockResolvedValue({
      ok: true,
      configured: true,
      value: null,
    })
    setKvValue.mockResolvedValue({
      ok: false,
      configured: true,
      reason: 'error',
      error: new Error('kv unavailable'),
    })

    await expect(
      shouldWarnAboutAlternateEmail(alternateEmailValidation)
    ).resolves.toBe(false)

    expect(warn).toHaveBeenCalled()
  })
})
