'use client'

import { type ReactElement, useId } from 'react'
import { cn } from '@/lib/utils'
import { Loader } from '@/ui/primitives/loader'
import TagFormatInvalidTooltip from './tag-format-invalid-tooltip'

export type TagNameStatus =
  | 'idle'
  | 'invalid'
  | 'checking'
  | 'exists'
  | 'available'

interface TagNameFieldProps {
  value: string
  onChange: (value: string) => void
  status: TagNameStatus
  disabled?: boolean
  autoFocus?: boolean
}

const STATUS_INDICATOR: Partial<Record<TagNameStatus, ReactElement>> = {
  checking: <Loader variant="slash" size="sm" aria-label="Checking tag name" />,
  exists: (
    <span className="prose-body whitespace-nowrap text-accent-error-highlight">
      Already exists
    </span>
  ),
  invalid: <TagFormatInvalidTooltip />,
}

export default function TagNameField({
  value,
  onChange,
  status,
  disabled,
  autoFocus,
}: TagNameFieldProps) {
  const id = useId()
  const indicator = STATUS_INDICATOR[status]
  const showAsInvalid = status === 'invalid' || status === 'exists'

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex h-9 w-full min-w-0 items-center gap-2 border bg-transparent px-3',
        'transition-colors anim-ease-appear anim-duration-fast',
        'hover:border-stroke-active',
        'focus-within:border-stroke-active focus-within:bg-bg-highlight',
        showAsInvalid && 'border-accent-error-highlight'
      )}
    >
      <input
        id={id}
        type="text"
        // biome-ignore lint/a11y/noAutofocus: dialog-scoped focus is expected UX
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter tag name"
        aria-invalid={showAsInvalid || undefined}
        className={cn(
          'prose-body min-w-0 flex-1 truncate bg-transparent outline-none placeholder:text-fg-tertiary',
          // Leading-truncation trick: flip to RTL only when blurred AND has content,
          // so the ellipsis appears at the start of the value.
          '[&:not(:focus):not(:placeholder-shown)]:[direction:rtl]',
          '[&:not(:focus):not(:placeholder-shown)]:text-left'
        )}
      />
      {indicator ? (
        <span className="flex shrink-0 items-center">{indicator}</span>
      ) : null}
    </label>
  )
}
