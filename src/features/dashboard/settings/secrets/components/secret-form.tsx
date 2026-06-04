'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/ui/primitives/button'
import { DialogFooter } from '@/ui/primitives/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'
import {
  type SecretFormInput,
  type SecretFormOutput,
  SecretFormSchema,
} from '../schema'
import { HostFieldArray } from './host-field-array'
import { SecretValueField } from './secret-value-field'

const DEFAULT_VALUES: SecretFormInput = {
  label: '',
  value: '',
  description: '',
  allowList: { mode: 'all', hosts: [] },
}

interface SecretFormProps {
  defaultValues?: Partial<SecretFormInput>
  onSubmit: (values: SecretFormOutput) => void | Promise<void>
  submitLabel: string
  submitIcon?: ReactNode
  loadingLabel?: string
  /** Edit flow only — keeps submit disabled until something actually changed. */
  requireDirty?: boolean
}

export function SecretForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitIcon,
  loadingLabel = 'Saving…',
  requireDirty = false,
}: SecretFormProps) {
  const form = useForm<SecretFormInput>({
    resolver: zodResolver(SecretFormSchema),
    mode: 'onChange',
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  })

  const { formState } = form
  const canSubmit =
    formState.isValid &&
    !formState.isSubmitting &&
    (!requireDirty || formState.isDirty)

  return (
    <Form {...form}>
      <form
        className="flex flex-1 flex-col justify-between gap-6 min-w-0 min-h-0"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-1 flex-col gap-4 min-w-0 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LabelField disabled={formState.isSubmitting} />
          <SecretValueField disabled={formState.isSubmitting} />
          <DescriptionField disabled={formState.isSubmitting} />
          <AllowListSection disabled={formState.isSubmitting} />
        </div>

        <DialogFooter>
          {formState.isSubmitting ? (
            <div className="flex items-center justify-center py-2 gap-2 w-full">
              <Loader size="sm" variant="slash" />
              <span className="prose-body text-fg-secondary">
                {loadingLabel}
              </span>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={!canSubmit}
              type="submit"
              variant="primary"
            >
              {submitIcon}
              {submitLabel}
            </Button>
          )}
        </DialogFooter>
      </form>
    </Form>
  )
}

function LabelField({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SecretFormInput>()
  return (
    <FormField
      control={control}
      name="label"
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel>label</FormLabel>
          <FormControl>
            <Input
              {...field}
              autoComplete="off"
              className="min-w-0"
              clearable
              disabled={disabled}
              onClear={() => field.onChange('')}
              placeholder="OpenAI API Key"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function DescriptionField({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SecretFormInput>()
  return (
    <FormField
      control={control}
      name="description"
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel>description (optional)</FormLabel>
          <FormControl>
            <Input
              {...field}
              autoComplete="off"
              className="min-w-0"
              clearable
              disabled={disabled}
              onClear={() => field.onChange('')}
              placeholder="e.g. intented use, environment, etc."
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function AllowListSection({ disabled }: { disabled?: boolean }) {
  const { control, setValue } = useFormContext<SecretFormInput>()
  const mode = useWatch({ control, name: 'allowList.mode' })

  const handleModeChange = (next: string) => {
    if (next === 'all') {
      setValue(
        'allowList',
        { mode: 'all', hosts: [] },
        { shouldValidate: true, shouldDirty: true }
      )
    } else if (next === 'specific') {
      setValue(
        'allowList',
        { mode: 'specific', hosts: [{ value: '' }] },
        { shouldValidate: true, shouldDirty: true }
      )
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label>allow list</Label>
        <p className="text-fg-tertiary prose-body">
          Define the websites and servers (hosts) that sandboxes may use this
          secret with
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <RadioGroup
          className="flex flex-col gap-2 px-0.5"
          disabled={disabled}
          onValueChange={handleModeChange}
          value={mode}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="allow-list-all" value="all" />
            <Label
              className="cursor-pointer select-none"
              htmlFor="allow-list-all"
            >
              all hosts
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="allow-list-specific" value="specific" />
            <Label
              className="cursor-pointer select-none"
              htmlFor="allow-list-specific"
            >
              specific hosts
            </Label>
          </div>
        </RadioGroup>

        <HostFieldArray disabled={disabled} />
      </div>
    </section>
  )
}
