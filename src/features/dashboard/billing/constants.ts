// addon identifiers
export const ADDON_500_SANDBOXES_ID = 'addon_500_sandboxes' as const

// tier identifiers
export const TIER_PRO_ID = 'pro_v1' as const
export const TIER_BASE_ID = 'base_v1' as const

// tier names for display
export const TIER_NAMES = {
  [TIER_BASE_ID]: 'Hobby',
  [TIER_PRO_ID]: 'Pro',
} as const

// addon purchase messages
export const ADDON_PURCHASE_MESSAGES = {
  success: {
    title: 'Add-on activated',
    description:
      '500 additional concurrent sandboxes have been added to your subscription',
  },
  loading: {
    processing: 'Processing...',
    loadingPaymentMethods: 'Loading your saved payment methods...',
  },
  error: {
    cardAuthFailed:
      'Card authentication failed. Please try a different payment method.',
    generic:
      'Something went wrong. Please try again or contact support if the issue persists.',
  },
} as const
