'use client'

import { forgotPasswordAction } from '@/server/auth/auth-actions'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { AUTH_URLS } from '@/configs/urls'
import { useSearchParams } from 'next/navigation'
import { useRef, useEffect, useTransition } from 'react'

export default function ForgotPassword() {
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()

  // Handle email prefill from sign in page
  useEffect(() => {
    const email = searchParams.get('email')
    if (email && emailRef.current) {
      emailRef.current.value = email
    }
    // Always focus the email field for accessibility
    emailRef.current?.focus()
  }, [searchParams])

  const handleBackToSignIn = () => {
    const email = emailRef.current?.value
    const searchParams = email ? `?email=${encodeURIComponent(email)}` : ''
    window.location.href = `${AUTH_URLS.SIGN_IN}${searchParams}`
  }

  // Parse search params into AuthMessage
  const message: AuthMessage | undefined = (() => {
    const error = searchParams.get('error')
    const success = searchParams.get('success')
    if (error) return { error: decodeURIComponent(error) }
    if (success) return { success: decodeURIComponent(success) }
    return undefined
  })()

  return (
    <div className="flex w-full flex-col">
      <h1 className="text-2xl font-medium">Reset Password</h1>
      <p className="text-fg-300 text-sm leading-6">
        Remember your password?{' '}
        <button
          type="button"
          onClick={handleBackToSignIn}
          className="text-fg font-medium underline"
        >
          Sign in
        </button>
      </p>

      <form ref={formRef} className="mt-5 flex flex-col gap-2 [&>input]:mb-1">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Button
          formAction={(data) =>
            startTransition(() => forgotPasswordAction(data))
          }
          loading={isPending}
        >
          Reset Password
        </Button>
      </form>

      {message && <AuthFormMessage className="mt-4" message={message} />}
    </div>
  )
}
