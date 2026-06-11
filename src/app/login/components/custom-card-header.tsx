'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'

export function OryCardHeader() {
  const { flowType } = useOryFlow()
  const title = flowType === FlowType.Registration ? 'Sign up' : 'Sign in'

  return <h1 className="mb-6">{title}</h1>
}
