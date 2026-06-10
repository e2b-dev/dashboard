'use client'

import { Login } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from './components'

// Client wrapper around <Login>. Component overrides are functions and can't
// cross the server→client boundary, so `components` is applied here rather than
// in the server page. `flow` and `config` are plain data and serialize fine.
//
// Prop types are derived from <Login> itself: two @ory/client-fetch copies are
// installed (one nested under @ory/nextjs), so referencing the LoginFlow type
// directly would mismatch what <Login> expects.
type LoginProps = ComponentProps<typeof Login>

export function LoginCard({
  flow,
  config,
}: Pick<LoginProps, 'flow' | 'config'>) {
  return <Login flow={flow} config={config} components={oryComponents} />
}
