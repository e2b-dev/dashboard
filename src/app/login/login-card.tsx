'use client'

import { Login } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from './components'

// Derive props from <Login>: two @ory/client-fetch copies are installed, so
// naming the LoginFlow type directly would mismatch.
type LoginProps = ComponentProps<typeof Login>

export function LoginCard({
  flow,
  config,
}: Pick<LoginProps, 'flow' | 'config'>) {
  return <Login flow={flow} config={config} components={oryComponents} />
}
