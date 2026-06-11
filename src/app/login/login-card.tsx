'use client'

import { Login } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from './components'

// Overrides are functions, so they're applied client-side here, not in the
// server page. Prop types come from <Login> itself: two @ory/client-fetch
// copies are installed, so naming the LoginFlow type directly would mismatch.
type LoginProps = ComponentProps<typeof Login>

export function LoginCard({
  flow,
  config,
}: Pick<LoginProps, 'flow' | 'config'>) {
  return <Login flow={flow} config={config} components={oryComponents} />
}
