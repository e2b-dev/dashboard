'use client'

import { useRouteParams } from '@/lib/hooks/use-route-params'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { loadStripe } from '@stripe/stripe-js'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { ADDON_PURCHASE_MESSAGES } from './constants'
import { extractAddonData, extractTierData } from './utils'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

/**
 * Provides themed appearance configuration for Stripe Payment Element
 * Matches design system: bg-highlight, stroke, stroke-active, fg, fg-tertiary
 */
export function usePaymentElementAppearance() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return {
    theme: 'flat' as const,
    variables: {
      // accent colors
      colorPrimary: isDark ? '#ff8800' : '#e56f00',
      colorDanger: isDark ? '#f54545' : '#ff4400',
      colorSuccess: isDark ? '#00d992' : '#00a670',

      // backgrounds
      colorBackground: isDark ? '#141414' : '#f5f5f5', // bg-1

      // text
      colorText: isDark ? '#ffffff' : '#0a0a0a', // fg
      colorTextSecondary: isDark ? '#e6e6e6' : '#333333', // fg-secondary
      colorTextPlaceholder: isDark ? '#848484' : '#707070', // fg-tertiary

      // icons
      colorIconCardError: isDark ? '#f54545' : '#ff4400',

      // typography
      fontFamily:
        '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSizeBase: '14px',
      fontLineHeight: '20px',
      fontWeightNormal: '400',
      fontWeightLight: '400',

      // borders
      borderRadius: '6px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2', // bg-highlight
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6', // stroke
        padding: '10px 12px',
        boxShadow: 'none',
        transition: 'border-color 150ms ease',
      },
      '.Input:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
        border: isDark ? '1px solid #383838' : '1px solid #c2c2c2',
      },
      '.Input:focus': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2', // stroke-active
        boxShadow: 'none',
        outline: 'none',
      },
      '.Input::placeholder': {
        color: isDark ? '#848484' : '#707070', // fg-tertiary
      },
      '.Label': {
        fontSize: '12px',
        fontWeight: '400',
        color: isDark ? '#e6e6e6' : '#333333', // fg-secondary
        marginBottom: '6px',
        textTransform: 'none',
      },
      '.Tab': {
        backgroundColor: isDark ? '#141414' : '#f5f5f5', // bg-1
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6', // stroke
        boxShadow: 'none',
      },
      '.Tab:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#ebebeb',
        border: isDark ? '1px solid #383838' : '1px solid #c2c2c2',
      },
      '.Tab--selected': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2', // bg-highlight
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2', // stroke-active
        boxShadow: 'none',
      },
      '.TabLabel': {
        fontWeight: '400',
        color: isDark ? '#ffffff' : '#0a0a0a',
      },
      '.TabIcon': {
        fill: isDark ? '#848484' : '#707070',
      },
      '.TabIcon--selected': {
        fill: isDark ? '#ffffff' : '#0a0a0a',
      },
      '.Block': {
        backgroundColor: isDark ? '#141414' : '#f5f5f5', // bg-1
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6', // stroke
      },
      '.PickerItem': {
        backgroundColor: isDark ? '#141414' : '#f5f5f5',
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6',
        padding: '10px 12px',
      },
      '.PickerItem:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#ebebeb',
        border: isDark ? '1px solid #383838' : '1px solid #c2c2c2',
      },
      '.PickerItem--selected': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2',
      },
      '.PickerItem--selected:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
      },
      '.AccordionButton': {
        backgroundColor: isDark ? '#141414' : '#f5f5f5',
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6',
      },
      '.AccordionButton:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#ebebeb',
        border: isDark ? '1px solid #383838' : '1px solid #c2c2c2',
      },
      '.AccordionButton--selected': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2',
      },
      '.AccordionButton--selected:hover': {
        backgroundColor: isDark ? '#1f1f1f' : '#f2f2f2',
      },
      '.Spinner': {
        color: isDark ? '#ff8800' : '#e56f00', // accent-main-highlight
        borderColor: isDark
          ? 'rgba(255, 136, 0, 0.3)'
          : 'rgba(229, 111, 0, 0.3)',
      },
      '.RedirectText': {
        color: isDark ? '#e6e6e6' : '#333333', // fg-secondary
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

export function useBillingItems() {
  const { teamIdOrSlug } = useRouteParams<'/dashboard/[teamIdOrSlug]/billing'>()
  const trpc = useTRPC()

  const { data: items, isLoading } = useQuery({
    ...trpc.billing.getItems.queryOptions({ teamIdOrSlug }),
    throwOnError: true,
  })

  const tierData = items ? extractTierData(items) : undefined
  const addonData =
    items && tierData
      ? extractAddonData(items, tierData.selected?.id)
      : undefined

  return {
    items,
    tierData,
    addonData,
    isLoading,
  }
}

export function useUsage() {
  const { teamIdOrSlug } = useRouteParams<'/dashboard/[teamIdOrSlug]/billing'>()
  const trpc = useTRPC()

  const { data: usage, isLoading } = useQuery({
    ...trpc.billing.getUsage.queryOptions({ teamIdOrSlug }),
    throwOnError: true,
  })

  return {
    usage,
    credits: usage?.credits,
    isLoading,
  }
}

export function useInvoices() {
  const { teamIdOrSlug } = useRouteParams<'/dashboard/[teamIdOrSlug]/billing'>()
  const trpc = useTRPC()

  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery(trpc.billing.getInvoices.queryOptions({ teamIdOrSlug }))

  return {
    invoices,
    isLoading,
    error,
  }
}

export function useTeamConcurrentLimit() {
  const { teamIdOrSlug } = useRouteParams<'/dashboard/[teamIdOrSlug]/billing'>()
  const trpc = useTRPC()

  const { data, isLoading } = useQuery({
    ...trpc.billing.getTeamConcurrentLimit.queryOptions({ teamIdOrSlug }),
    throwOnError: true,
  })

  return {
    concurrentSandboxes: data?.concurrentSandboxes ?? 0,
    isLoading,
  }
}
