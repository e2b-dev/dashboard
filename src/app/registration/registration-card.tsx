'use client'

import { Registration } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from '@/app/login/components'

type RegistrationProps = ComponentProps<typeof Registration>

export function RegistrationCard({
  flow,
  config,
}: Pick<RegistrationProps, 'flow' | 'config'>) {
  return <Registration flow={flow} config={config} components={oryComponents} />
}
