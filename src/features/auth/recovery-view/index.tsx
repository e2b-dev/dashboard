import Link from 'next/link'
import type { AuthMessage } from '@/features/auth/form-message'
import { AuthFormMessage } from '@/features/auth/form-message'
import { ResendVerificationForm } from '@/features/auth/resend-verification'

type RecoveryViewProps = {
  title: string
  message?: AuthMessage
  initialEmail: string
  returnTo?: string
  backToSignInHref: string
}

export function RecoveryView({
  title,
  message,
  initialEmail,
  returnTo,
  backToSignInHref,
}: RecoveryViewProps) {
  return (
    <div className="flex w-full flex-col">
      <h1>{title}</h1>
      {message && <AuthFormMessage className="mt-4" message={message} />}
      <ResendVerificationForm
        className="mt-4"
        initialEmail={initialEmail}
        returnTo={returnTo}
        showDivider={false}
      />
      <p className="text-fg-secondary mt-3 leading-6">
        <Link className="text-fg underline" href={backToSignInHref}>
          Back to sign in
        </Link>
        .
      </p>
    </div>
  )
}
