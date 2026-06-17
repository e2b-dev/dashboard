'use client'

import { Recovery } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from '@/app/login/components'

type RecoveryProps = ComponentProps<typeof Recovery>

export function RecoveryCard({
  flow,
  config,
}: Pick<RecoveryProps, 'flow' | 'config'>) {
  return <Recovery flow={flow} config={config} components={oryComponents} />
}
