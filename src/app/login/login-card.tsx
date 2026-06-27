'use client'

import { Login } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from './components'

// Two @ory/client-fetch copies are installed (this app's vs the one bundled by
// @ory/elements-react), so the server-fetched flow's type differs from <Login>'s
// flow prop. This wrapper is the single bridge: accept flow loosely and cast it
// to <Login>'s own prop type, which re-narrows at render.
type LoginProps = ComponentProps<typeof Login>

export function LoginCard({
  flow,
  config,
}: { flow: unknown } & Pick<LoginProps, 'config'>) {
  return (
    <Login
      flow={flow as LoginProps['flow']}
      config={config}
      components={oryComponents}
    />
  )
}
