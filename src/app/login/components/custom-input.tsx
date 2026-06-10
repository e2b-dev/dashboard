'use client'

import type { OryNodeInputProps } from '@ory/elements-react'
import { Input } from '@/ui/primitives/input'

// Renders Ory input nodes with the dashboard's own <Input>. `inputProps` carries
// all of Ory's wiring (name/value/onChange/ref/type/…) and is spread straight
// through, so behaviour is unchanged — only the styling is ours.
export function OryInput({ inputProps, node }: OryNodeInputProps) {
  // Friendly placeholders to match the dashboard's auth form. Ory/Kratos nodes
  // don't carry these, so we derive them from the field.
  const placeholder =
    node.attributes.name === 'identifier' || inputProps.type === 'email'
      ? 'you@example.com'
      : inputProps.type === 'password'
        ? '••••••••••••'
        : undefined

  return <Input {...inputProps} {...(placeholder ? { placeholder } : {})} />
}
