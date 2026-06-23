'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'
import { E2BLogoSmall } from '@/ui/brand'
import { getReauthInfo, type ReauthCredential } from './reauth'

const TITLE_BY_FLOW: Partial<Record<FlowType, string>> = {
  [FlowType.Login]: 'Sign in',
  [FlowType.Registration]: 'Sign up',
  [FlowType.Recovery]: 'Reset your password',
  [FlowType.Verification]: 'Verify your email',
}

const REAUTH_DESCRIPTION: Record<ReauthCredential, string> = {
  social: 'Confirm your identity with a social provider.',
  password: 'Confirm your identity with your email and password.',
}

const DESCRIPTION_BY_FLOW: Partial<Record<FlowType, string>> = {
  [FlowType.Login]: 'Sign in with a social provider or your email.',
  [FlowType.Registration]: 'Sign up with a social provider or your email.',
  [FlowType.Recovery]: 'Enter your email to recover your account.',
  [FlowType.Verification]: 'Enter your email to verify your account.',
}

export function OryCardHeader() {
  const oryFlow = useOryFlow()
  const { isReauthLogin, credential } = getReauthInfo(oryFlow)

  const title = isReauthLogin
    ? 'Reauthenticate'
    : (TITLE_BY_FLOW[oryFlow.flowType] ?? 'Sign in')
  const description = isReauthLogin
    ? credential
      ? REAUTH_DESCRIPTION[credential]
      : null
    : (DESCRIPTION_BY_FLOW[oryFlow.flowType] ?? null)

  return (
    <div className="mb-6 flex flex-col gap-8">
      <E2BLogoSmall className="text-fg h-[18px] self-start" />
      <div className="flex flex-col gap-1">
        <h1 className="prose-headline-small">{title}</h1>
        {description && <p className="text-fg-secondary">{description}</p>}
      </div>
    </div>
  )
}
