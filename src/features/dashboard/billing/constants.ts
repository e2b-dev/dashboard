export const ADDON_500_SANDBOXES_ID = 'addon_concurrency_500_sandboxes' as const

export const TIER_PRO_ID = 'pro_v1' as const
export const TIER_BASE_ID = 'base_v1' as const

export const ADDON_PURCHASE_ACTION_ERRORS = {
  missingPaymentMethod: 'missing_payment_method',
}

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
    // user-actionable: card authentication (3D Secure) failed
    cardAuthFailed:
      'Card authentication failed. Please try a different payment method.',
    missingPaymentMethod:
      'You have no attached payment method. Please add a payment method via "Manage subscription" first.',
    // generic error for all other failures (logged on our side)
    generic:
      'Something went wrong. Please try again or contact support if the issue persists.',
  },
} as const
