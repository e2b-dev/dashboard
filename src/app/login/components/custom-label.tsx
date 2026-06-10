'use client'

import type { OryNodeLabelProps } from '@ory/elements-react'
import { cn } from '@/lib/utils'
import { Label } from '@/ui/primitives/label'

// Wraps each field with the dashboard's uppercase <Label> above the input, plus
// any Kratos validation messages below — mirroring the dashboard's FormItem.
export function OryLabel({ node, children, fieldError }: OryNodeLabelProps) {
  const label = node.meta?.label?.text
  const messages = node.messages ?? []
  const fieldErrorText =
    fieldError && typeof fieldError === 'object' && 'text' in fieldError
      ? String((fieldError as { text: unknown }).text)
      : undefined

  return (
    <div className="flex w-full flex-col gap-2">
      {label && <Label htmlFor={node.attributes.name}>{label}</Label>}
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
