'use client'

import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { useCallback, useRef, useState } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

export function useTurnstile<T extends FieldValues & { captchaToken?: string }>(
  form: UseFormReturn<T>
) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const reset = useCallback(() => {
    turnstileRef.current?.reset()
    setCaptchaToken(null)
  }, [])

  const handleSuccess = useCallback(
    (token: string) => {
      setCaptchaToken(token)
      form.setValue('captchaToken' as Path<T>, token as T[Path<T>])
    },
    [form]
  )

  const handleExpire = useCallback(() => {
    setCaptchaToken(null)
    form.setValue('captchaToken' as Path<T>, undefined as T[Path<T>])
  }, [form])

  return {
    captchaToken,
    turnstileRef,
    reset,
    handleSuccess,
    handleExpire,
  }
}
