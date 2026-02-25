'use client'

import { AUTH_URLS } from '@/configs/urls'
import { AuthFormMessage } from '@/features/auth/form-message'
import {
  type ConfirmEmailInput,
  ConfirmEmailInputSchema,
  type OtpType,
  OtpTypeSchema,
} from '@/server/api/models/auth.models'
import { Button } from '@/ui/primitives/button'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useTransition } from 'react'

const OTP_TYPE_LABELS: Record<OtpType, string> = {
  signup: 'Welcome to E2B',
  recovery: 'Password Recovery',
  invite: 'Team Invitation',
  magiclink: 'Sign In',
  email: 'Verify Email',
  email_change: 'Confirm Email Change',
}

const OTP_TYPE_DESCRIPTIONS: Record<OtpType, string> = {
  signup: 'Click below to verify your email and create your account.',
  recovery:
    'Click below to sign in. You will be forwarded to the account settings page where you can change your password.',
  invite: 'Click below to accept the invitation and join the team.',
  magiclink: 'Click below to sign in to your account.',
  email: 'Click below to verify your email address.',
  email_change: 'Click below to confirm your new email address.',
}

const OTP_TYPE_BUTTON_LABELS: Record<OtpType, string> = {
  signup: 'Create Account',
  recovery: 'Sign In',
  invite: 'Join Team',
  magiclink: 'Sign In',
  email: 'Verify Email',
  email_change: 'Confirm Email',
}

interface VerifyOtpResponse {
  redirectUrl: string
}

/**
 * Verifies OTP and returns a redirect URL.
 * The API always returns a redirectUrl - errors redirect to sign-in with encoded error params.
 */
async function verifyOtp(input: ConfirmEmailInput): Promise<VerifyOtpResponse> {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return response.json()
}

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const params = useMemo(() => {
    const tokenHash = searchParams.get('token_hash') ?? ''
    const typeParam = searchParams.get('type')
    const typeResult = OtpTypeSchema.safeParse(typeParam)
    const type: OtpType | null = typeResult.success ? typeResult.data : null
    const next = searchParams.get('next') ?? ''

    return { tokenHash, type, next }
  }, [searchParams])

  const isValidParams = ConfirmEmailInputSchema.safeParse({
    token_hash: params.tokenHash,
    type: params.type,
    next: params.next,
  }).success

  const typeLabel = params.type ? OTP_TYPE_LABELS[params.type] : 'Verification'
  const typeDescription = params.type
    ? OTP_TYPE_DESCRIPTIONS[params.type]
    : 'Confirm your action'
  const buttonLabel = params.type
    ? OTP_TYPE_BUTTON_LABELS[params.type]
    : 'Continue'

  const mutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      startTransition(() => {
        router.push(data.redirectUrl)
      })
    },
  })

  const handleConfirm = () => {
    if (!isValidParams || !params.type) return

    mutation.mutate({
      token_hash: params.tokenHash,
      type: params.type,
      next: params.next,
    })
  }

  return (
    <div className="flex w-full flex-col">
      <h1>{typeLabel}</h1>
      <p className="text-fg-secondary leading-6 mt-1">{typeDescription}</p>

      <div className="mt-5">
        <Button
          onClick={handleConfirm}
          loading={mutation.isPending || isPending}
          disabled={!isValidParams}
          className="w-full"
        >
          {buttonLabel}
        </Button>
      </div>

      <p className="text-fg-secondary mt-3 leading-6">
        Changed your mind?{' '}
        <button
          type="button"
          onClick={() => router.push(AUTH_URLS.SIGN_IN)}
          className="text-fg underline"
        >
          Back to sign in
        </button>
        .
      </p>

      {!isValidParams && (
        <AuthFormMessage
          className="mt-4"
          message={{
            error: 'Invalid verification link. Please request a new one.',
          }}
        />
      )}
    </div>
  )
}
