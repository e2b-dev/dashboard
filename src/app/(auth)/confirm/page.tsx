'use client'

import { AUTH_URLS } from '@/configs/urls'
import { AuthFormMessage } from '@/features/auth/form-message'
import {
  ConfirmEmailInputSchema,
  type ConfirmEmailInput,
  type OtpType,
} from '@/server/api/models/auth.models'
import { Button } from '@/ui/primitives/button'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useTransition } from 'react'

const OTP_TYPE_LABELS: Record<OtpType, string> = {
  signup: 'Sign Up',
  recovery: 'Password Reset',
  invite: 'Team Invitation',
  magiclink: 'Sign In',
  email: 'Email Verification',
  email_change: 'Email Change',
}

const OTP_TYPE_DESCRIPTIONS: Record<OtpType, string> = {
  signup: 'Complete your account registration',
  recovery: 'Reset your password',
  invite: 'Accept team invitation',
  magiclink: 'Sign in to your account',
  email: 'Verify your email address',
  email_change: 'Confirm your new email address',
}

interface VerifyOtpResponse {
  redirectUrl?: string
  error?: string
}

async function verifyOtp(input: ConfirmEmailInput): Promise<VerifyOtpResponse> {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data: VerifyOtpResponse = await response.json()

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Verification failed. Please try again.')
  }

  return data
}

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const params = useMemo(() => {
    const tokenHash = searchParams.get('token_hash') ?? ''
    const type = searchParams.get('type') as OtpType | null
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

  const mutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      if (data.redirectUrl) {
        startTransition(() => {
          router.push(data.redirectUrl!)
        })
      }
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
      <p className="text-fg-secondary leading-6">{typeDescription}</p>

      <div className="mt-5">
        <Button
          onClick={handleConfirm}
          loading={mutation.isPending || isPending}
          disabled={!isValidParams}
          className="w-full"
        >
          Confirm
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

      {!isValidParams && !mutation.error && (
        <AuthFormMessage
          className="mt-4"
          message={{
            error: 'Invalid verification link. Please request a new one.',
          }}
        />
      )}

      {mutation.error && (
        <AuthFormMessage
          className="mt-4"
          message={{ error: mutation.error.message }}
        />
      )}
    </div>
  )
}
