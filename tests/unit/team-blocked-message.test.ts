import { describe, expect, it } from 'vitest'
import {
  getBlockedMessage,
  getBlockedReasonText,
} from '@/features/dashboard/team-blocked/team-blocked-message'

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

describe('getBlockedReasonText', () => {
  it('returns the friendly text for billing limit', () => {
    expect(getBlockedReasonText('billing limit')).toBe('Billing limit reached.')
    expect(getBlockedReasonText('Billing limit reached')).toBe(
      'Billing limit reached.'
    )
  })

  it('returns the friendly text for missing payment method', () => {
    expect(getBlockedReasonText('missing payment method')).toBe(
      'Missing payment method.'
    )
  })

  it('returns the friendly text for verification required', () => {
    expect(getBlockedReasonText('verification required')).toBe(
      'Verification required.'
    )
  })

  it('returns the raw reason for support-set messages', () => {
    expect(getBlockedReasonText('blocked by support')).toBe(
      'blocked by support'
    )
  })

  it('returns a generic fallback for null reason', () => {
    expect(getBlockedReasonText(null)).toBe('Project suspended.')
  })
})
