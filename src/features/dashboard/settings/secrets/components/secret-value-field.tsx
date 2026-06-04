'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { EyeIcon, EyeOffIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import type { SecretFormInput } from '../schema'

export function SecretValueField({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SecretFormInput>()
  const [revealed, setRevealed] = useState(false)

  return (
    <FormField
      control={control}
      name="value"
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel>secret value</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                autoComplete="off"
                className="min-w-0 pr-9 font-mono"
                disabled={disabled}
                placeholder="••••••••••••"
                type={revealed ? 'text' : 'password'}
              />
            </FormControl>
            <button
              aria-label={revealed ? 'Hide secret value' : 'Show secret value'}
              aria-pressed={revealed}
              className="text-fg-tertiary hover:text-fg absolute right-2.5 top-1/2 -translate-y-1/2"
              disabled={disabled}
              onClick={() => setRevealed((prev) => !prev)}
              type="button"
            >
              {revealed ? (
                <EyeOffIcon aria-hidden className="size-4" />
              ) : (
                <EyeIcon aria-hidden className="size-4" />
              )}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
