'use client'

import { Registration } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from '@/app/login/components'

// Client wrapper around <Registration>, mirroring <LoginCard>. The component
// overrides (functions) can't cross the server→client boundary, so they're
// applied here. The same `oryComponents` set powers both flows — the header and
// footer branch on the flow type internally.
type RegistrationProps = ComponentProps<typeof Registration>

export function RegistrationCard({
  flow,
  config,
}: Pick<RegistrationProps, 'flow' | 'config'>) {
  return <Registration flow={flow} config={config} components={oryComponents} />
}
