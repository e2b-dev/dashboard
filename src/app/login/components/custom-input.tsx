'use client'

import type { OryNodeInputProps } from '@ory/elements-react'
import { Input } from '@/ui/primitives/input'

export function OryInput({ inputProps, node }: OryNodeInputProps) {
  const placeholder =
    node.attributes.name === 'identifier' || inputProps.type === 'email'
      ? 'you@example.com'
      : inputProps.type === 'password'
        ? '••••••••••••'
        : undefined

  return <Input {...inputProps} {...(placeholder ? { placeholder } : {})} />
}
