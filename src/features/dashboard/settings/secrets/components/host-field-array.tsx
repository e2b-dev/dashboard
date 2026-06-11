'use client'

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/ui/primitives/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { IconButton } from '@/ui/primitives/icon-button'
import { AddIcon, LinkIcon, RemoveIcon, TrashIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { MAX_SECRET_HOSTS } from '../constants'
import type { SecretFormInput } from '../schema'

export function HostFieldArray({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SecretFormInput>()
  const allowListMode = useWatch({ control, name: 'allowList.mode' })

  // Field array is only meaningful when the user picked "specific hosts".
  // Returning null on "all" keeps RHF from registering a stray field array.
  if (allowListMode !== 'specific') return null

  return <HostFieldArrayBody disabled={disabled} />
}

function HostFieldArrayBody({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SecretFormInput>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'allowList.hosts',
  })

  const atMax = fields.length >= MAX_SECRET_HOSTS
  const onlyOne = fields.length <= 1

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <li className="flex items-start gap-1.5" key={field.id}>
            <FormField
              control={control}
              name={`allowList.hosts.${index}.value`}
              render={({ field: hostField }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Input
                      {...hostField}
                      clearable
                      onClear={() => {
                        hostField.onChange('')
                      }}
                      autoComplete="off"
                      className="min-w-0"
                      disabled={disabled}
                      placeholder="example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {index > 0 && (
              <IconButton
                variant="secondary"
                aria-label={`Remove host ${index + 1}`}
                disabled={disabled || onlyOne}
                onClick={() => remove(index)}
                type="button"
              >
                <TrashIcon aria-hidden className="size-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        className="w-fit"
        disabled={disabled || atMax}
        onClick={() => append({ value: '' })}
        type="button"
      >
        <AddIcon aria-hidden className="size-4" />
        Add more
      </Button>
    </div>
  )
}
