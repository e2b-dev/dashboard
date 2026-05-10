import { PROTECTED_URLS } from '@/configs/urls'
import { TEAM_BLOCKED_REASONS } from '@/core/modules/teams/constants'

export interface BlockedMessage {
  text: string
  cta: string | null
  href: string | null
}

export function getBlockedMessage(
  slug: string,
  blockedReason: string | null
): BlockedMessage {
  const reason = blockedReason?.toLowerCase() ?? ''

  if (reason.includes('billing limit')) {
    return {
      text: 'Billing limit reached.',
      cta: 'Update limit.',
      href: PROTECTED_URLS.LIMITS(slug),
    }
  }

  if (reason.includes(TEAM_BLOCKED_REASONS.missingPayment)) {
    return {
      text: 'Missing payment method.',
      cta: 'Add payment method.',
      href: null,
    }
  }

  if (reason.includes(TEAM_BLOCKED_REASONS.verification)) {
    return {
      text: 'Verification required.',
      cta: 'Complete verification.',
      href: null,
    }
  }

  return {
    text: blockedReason ?? 'Team suspended.',
    cta: null,
    href: null,
  }
}
