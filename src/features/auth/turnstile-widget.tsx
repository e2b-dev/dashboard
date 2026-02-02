'use client'

import { CAPTCHA_ENABLED } from '@/configs/flags'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { forwardRef } from 'react'

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  className?: string
}

export const TurnstileWidget = forwardRef<
  TurnstileInstance,
  TurnstileWidgetProps
>(function TurnstileWidget({ onSuccess, onExpire, onError, className }, ref) {
  if (!CAPTCHA_ENABLED) return null

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return null

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onSuccess}
      onExpire={onExpire}
      onError={onError}
      options={{ theme: 'auto', size: 'normal' }}
      className={className}
    />
  )
})
