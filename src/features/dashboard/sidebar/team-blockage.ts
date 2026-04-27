// Normalizes a block reason; "payment_method_missing" -> "payment method missing".
const normalizeBlockReason = (reason: string) =>
  reason.toLowerCase().replace(/[_-]+/g, ' ').trim()

// Checks for missing payment method blockage; "payment_method_missing" -> true.
const isMissingPaymentMethodBlockReason = (reason?: string | null) => {
  if (!reason) return false

  const normalizedReason = normalizeBlockReason(reason)

  return (
    normalizedReason.includes('payment method missing') ||
    normalizedReason.includes('missing payment method')
  )
}

export { isMissingPaymentMethodBlockReason }
