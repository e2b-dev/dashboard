import { describe, expect, it } from 'vitest'
import { getBlockedMessage } from '@/features/dashboard/team-blocked/team-blocked-message'

describe('getBlockedMessage', () => {
  it('links billing limit blocks to limits', () => {
    expect(getBlockedMessage('team-slug', 'billing limit reached')).toEqual({
      text: 'Billing limit reached.',
      cta: 'Update limit.',
      href: '/dashboard/team-slug/limits',
    })
  })

  it('opens the missing payment method recovery dialog', () => {
    expect(getBlockedMessage('team-slug', 'missing payment method')).toEqual({
      text: 'Missing payment method.',
      cta: 'Add payment method.',
      href: null,
    })
  })

  it('opens the verification recovery dialog', () => {
    expect(getBlockedMessage('team-slug', 'verification required')).toEqual({
      text: 'Verification required.',
      cta: 'Complete verification.',
      href: null,
    })
  })

  it('falls back to the backend-provided block reason', () => {
    expect(getBlockedMessage('team-slug', 'blocked by support')).toEqual({
      text: 'blocked by support',
      cta: null,
      href: null,
    })
  })
})
