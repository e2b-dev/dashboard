'use client'

import { CAPTCHA_REQUIRED_CLIENT } from '@/configs/flags'
import { cn } from '@/lib/utils'
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
  if (!CAPTCHA_REQUIRED_CLIENT) return null

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

  return (
    <div className={cn('w-full', className)}>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
        options={{
          size: 'flexible',
          appearance: 'always',
        }}
      />
    </div>
  )
})
