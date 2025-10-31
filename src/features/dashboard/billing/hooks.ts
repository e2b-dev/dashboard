import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { loadStripe } from '@stripe/stripe-js'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { ADDON_PURCHASE_MESSAGES } from './constants'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

/**
 * Provides themed appearance configuration for Stripe Payment Element
 */
export function usePaymentElementAppearance() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return {
    theme: 'flat' as const,
    variables: {
      colorPrimary: isDark ? '#ff8800' : '#e56f00',
      colorBackground: isDark ? '#1f1f1f' : '#f2f2f2',
      colorText: isDark ? '#ffffff' : '#0a0a0a',
      colorDanger: isDark ? '#f54545' : '#ff4400',
      colorSuccess: isDark ? '#00d992' : '#00a670',
      fontFamily:
        '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSizeBase: '14px',
      fontLineHeight: '20px',
      borderRadius: '6px',
      colorTextPlaceholder: isDark ? '#848484' : '#707070',
      colorIconCardError: isDark ? '#f54545' : '#ff4400',
    },
    rules: {
      '.Input': {
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2',
        boxShadow: 'none',
      },
      '.Label': {
        fontSize: '12px',
        fontWeight: '400',
        marginBottom: '6px',
      },
    },
  }
}

interface UsePaymentConfirmationOptions {
  onSuccess: () => void
  onFallbackToPaymentElement: (clientSecret: string) => void
}

/**
 * Handles the payment confirmation flow with fallback to manual payment entry
 */
export function usePaymentConfirmation({
  onSuccess,
  onFallbackToPaymentElement,
}: UsePaymentConfirmationOptions) {
  const { toast } = useToast()
  const [isConfirming, setIsConfirming] = useState(false)

  const confirmPayment = async (clientSecret: string) => {
    setIsConfirming(true)

    try {
      const stripe = await stripePromise

      if (!stripe) {
        console.error('[Payment] Stripe failed to load')
        toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
        setIsConfirming(false)
        return
      }

      // retrieve payment intent to check status
      const { paymentIntent, error: retrieveError } =
        await stripe.retrievePaymentIntent(clientSecret)

      if (retrieveError) {
        console.error(
          '[Payment] Failed to retrieve payment intent:',
          retrieveError
        )
        toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
        onFallbackToPaymentElement(clientSecret)
        setIsConfirming(false)
        return
      }

      // fallback if no payment method attached
      if (paymentIntent.status === 'requires_payment_method') {
        onFallbackToPaymentElement(clientSecret)
        setIsConfirming(false)
        return
      }

      // handle 3D Secure or other authentication
      if (paymentIntent.status === 'requires_action') {
        const { error: actionError } = await stripe.handleNextAction({
          clientSecret,
        })

        if (actionError) {
          console.error('[Payment] Card authentication failed:', actionError)
          toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.cardAuthFailed))
          onFallbackToPaymentElement(clientSecret)
          setIsConfirming(false)
          return
        }

        // verify final status after authentication
        const { paymentIntent: finalIntent, error: finalError } =
          await stripe.retrievePaymentIntent(clientSecret)

        if (finalError || finalIntent.status !== 'succeeded') {
          console.error(
            '[Payment] Final payment check failed:',
            finalError?.message,
            finalIntent?.status
          )
          toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
          setIsConfirming(false)
          return
        }
      } else if (paymentIntent.status !== 'succeeded') {
        console.error(
          '[Payment] Unexpected payment status:',
          paymentIntent?.status
        )
        toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
        setIsConfirming(false)
        return
      }

      // success
      toast({
        title: ADDON_PURCHASE_MESSAGES.success.title,
        description: ADDON_PURCHASE_MESSAGES.success.description,
      })
      onSuccess()
      setIsConfirming(false)
    } catch (err) {
      console.error(
        '[Payment] Unexpected error during payment confirmation:',
        err
      )
      toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
      setIsConfirming(false)
    }
  }

  return { confirmPayment, isConfirming }
}

export { stripePromise }
