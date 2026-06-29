'use client'

import type { OryNodeInputProps } from '@ory/elements-react'
import { useState } from 'react'
import { EyeClosedIcon, EyeOpenIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'

export function OryInput({ inputProps, node }: OryNodeInputProps) {
  const isPassword = inputProps.type === 'password'
  const [revealed, setRevealed] = useState(false)

  const placeholder =
    node.attributes.name === 'identifier' || inputProps.type === 'email'
      ? 'you@example.com'
      : isPassword
        ? '••••••••••••'
        : undefined

  const input = (
    <Input
      {...inputProps}
      {...(placeholder ? { placeholder } : {})}
      {...(isPassword
        ? { type: revealed ? 'text' : 'password', className: 'pr-8' }
        : {})}
    />
  )

  if (!isPassword) return input

  return (
    <div className="relative w-full">
      {input}
      <button
        type="button"
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        onClick={() => setRevealed((value) => !value)}
        className="text-fg-tertiary hover:text-fg absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center"
      >
        {revealed ? (
          <EyeClosedIcon className="size-4" />
        ) : (
          <EyeOpenIcon className="size-4" />
        )}
      </button>
    </div>
  )
}
