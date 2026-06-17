'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'

const TITLE_BY_FLOW: Partial<Record<FlowType, string>> = {
  [FlowType.Login]: 'Sign in',
  [FlowType.Registration]: 'Sign up',
  [FlowType.Recovery]: 'Reset your password',
  [FlowType.Verification]: 'Verify your email',
}

export function OryCardHeader() {
  const { flowType } = useOryFlow()
  const title = TITLE_BY_FLOW[flowType] ?? 'Sign in'

  return <h1 className="mb-6">{title}</h1>
}
