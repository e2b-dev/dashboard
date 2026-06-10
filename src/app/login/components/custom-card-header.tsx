'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'

// Card header, shared by the login and registration flows. Renders a plain
// <h1>, which the dashboard's global base styles render as the uppercase, bold
// heading — and replaces Ory's default header (logo + title), so the
// project-name line no longer shows.
//
// The card no longer sets a flex `gap`, so the header owns the space below it
// (the divider's own `my-6` handles the gap between the social and email forms).
export function OryCardHeader() {
  const { flowType } = useOryFlow()
  const title = flowType === FlowType.Registration ? 'Sign up' : 'Sign in'

  return <h1 className="mb-6">{title}</h1>
}
