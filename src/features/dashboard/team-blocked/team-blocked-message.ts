import { PROTECTED_URLS } from '@/configs/urls'
import { TEAM_BLOCKED_REASONS } from '@/core/modules/teams/constants'

export interface BlockedMessage {
  text: string
  cta: string | null
  href: string | null
}

export function getBlockedReasonText(blockedReason: string | null): string {
  const reason = blockedReason?.toLowerCase() ?? ''

  if (reason.includes(TEAM_BLOCKED_REASONS.billingLimit)) {
    return 'Billing limit reached.'
  }
  if (reason.includes(TEAM_BLOCKED_REASONS.missingPayment)) {
    return 'Missing payment method.'
  }
  if (reason.includes(TEAM_BLOCKED_REASONS.verification)) {
    return 'Verification required.'
  }

  return blockedReason ?? 'Project suspended.'
}

export function getBlockedMessage(
  slug: string,
  blockedReason: string | null
): BlockedMessage {
  const reason = blockedReason?.toLowerCase() ?? ''
  const text = getBlockedReasonText(blockedReason)

  if (reason.includes(TEAM_BLOCKED_REASONS.billingLimit)) {
    return {
      text,
      cta: 'Update limit.',
      href: PROTECTED_URLS.LIMITS(slug),
    }
  }

  if (reason.includes(TEAM_BLOCKED_REASONS.missingPayment)) {
    return {
      text,
      cta: 'Add payment method.',
      href: null,
    }
  }

  if (reason.includes(TEAM_BLOCKED_REASONS.verification)) {
    return {
      text,
      cta: 'Complete verification.',
      href: null,
    }
  }

  return {
    text,
    cta: null,
    href: null,
  }
}
