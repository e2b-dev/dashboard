'use client'

import { Verification } from '@ory/elements-react/theme'
import type { ComponentProps } from 'react'
import { oryComponents } from '@/app/login/components'

type VerificationProps = ComponentProps<typeof Verification>

export function VerificationCard({
  flow,
  config,
}: { flow: unknown } & Pick<VerificationProps, 'config'>) {
  return (
    <Verification
      flow={flow as VerificationProps['flow']}
      config={config}
      components={oryComponents}
    />
  )
}
