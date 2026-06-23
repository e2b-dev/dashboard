'use client'

import { FlowType } from '@ory/client-fetch'
import { type OryNodeLabelProps, useOryFlow } from '@ory/elements-react'
import Link from 'next/link'
import { AUTH_URLS } from '@/configs/urls'
import { cn } from '@/lib/utils'
import { Label } from '@/ui/primitives/label'

export function OryLabel({ node, children, fieldError }: OryNodeLabelProps) {
  const { flowType } = useOryFlow()
  const label = node.meta?.label?.text
  const messages = node.messages ?? []
  const fieldErrorText =
    fieldError && typeof fieldError === 'object' && 'text' in fieldError
      ? String((fieldError as { text: unknown }).text)
      : undefined

  // identifier_first login splits the credential across steps, so the recovery
  // link rides whichever field is on screen: the email on step one, the
  // password on step two.
  const recoverLabel =
    flowType === FlowType.Login
      ? node.attributes.name === 'identifier'
        ? 'Recover Account'
        : node.attributes.name === 'password'
          ? 'Forgot password?'
          : null
      : null

  return (
    <div className="flex w-full flex-col gap-2">
      {label &&
        (recoverLabel ? (
          <div className="flex w-full items-center justify-between">
            <Label htmlFor={node.attributes.name}>{label}</Label>
            <Link
              prefetch={false}
              target="_top"
              href={AUTH_URLS.FORGOT_PASSWORD}
              tabIndex={-1}
              className="prose-label text-fg-secondary hover:text-fg underline underline-offset-[3px]"
            >
              {recoverLabel}
            </Link>
          </div>
        ) : (
          <Label htmlFor={node.attributes.name}>{label}</Label>
        ))}
      {children}
      {messages.map((message) => (
        <span
          key={message.id}
          className={cn(
            'prose-label',
            message.type === 'error'
              ? 'text-accent-error-highlight'
              : 'text-fg-tertiary'
          )}
        >
          {message.text}
        </span>
      ))}
      {fieldErrorText && (
        <span className="prose-label text-accent-error-highlight">
          {fieldErrorText}
        </span>
      )}
    </div>
  )
}
