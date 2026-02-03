'use client'

import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

const HIDE_DELAY_MS = 2000

export function useTurnstile<T extends FieldValues & { captchaToken?: string }>(
  form: UseFormReturn<T>
) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const reset = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    turnstileRef.current?.reset()
    setCaptchaToken(null)
    setIsVerified(false)
  }, [])

  const handleSuccess = useCallback(
    (token: string) => {
      setCaptchaToken(token)
      form.setValue('captchaToken' as Path<T>, token as T[Path<T>])

      hideTimeoutRef.current = setTimeout(() => {
        setIsVerified(true)
      }, HIDE_DELAY_MS)
    },
    [form]
  )

  const handleExpire = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setCaptchaToken(null)
    setIsVerified(false)
    form.setValue('captchaToken' as Path<T>, undefined as T[Path<T>])
  }, [form])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  return {
    captchaToken,
    isVerified,
    turnstileRef,
    reset,
    handleSuccess,
    handleExpire,
  }
}
