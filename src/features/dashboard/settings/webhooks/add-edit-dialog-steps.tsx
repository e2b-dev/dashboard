'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { UpsertWebhookSchemaType } from '@/core/server/functions/webhooks/schema'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { Button } from '@/ui/primitives/button'
import { Checkbox } from '@/ui/primitives/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { CheckIcon, CopyIcon, WarningIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import {
  WEBHOOK_DOCS_URL,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from './constants'

type WebhookAddEditDialogStepsProps = {
  currentStep: number
  form: UseFormReturn<UpsertWebhookSchemaType>
  isLoading: boolean
  selectedEvents: string[]
  exampleEventType: WebhookEvent
  allEventsSelected: boolean
  handleAllToggle: () => void
  handleEventToggle: (event: string) => void
  mode: 'add' | 'edit'
  hasCopied: boolean
  onCopied: () => void
}

const WebhookExamplePayload = ({ eventType }: { eventType: WebhookEvent }) => (
  <div className="bg-bg border border-stroke flex w-full items-center px-4 py-2.5 font-mono text-[13px] leading-5 text-fg-secondary whitespace-pre-wrap">
    <div className="flex-1 min-w-px">
      <div>{'{'}</div>
      <div>
        {'  '}
        <span className="text-accent-main-highlight">{'"type"'}</span>
        {`: "${eventType}",`}
      </div>
      <div>
        {'  '}
        <span className="text-accent-main-highlight">{'"sandboxId"'}</span>
        {': "<UUID>",'}
      </div>
      <div>
        {'  '}
        <span className="text-accent-main-highlight">{'"timestamp"'}</span>
        {': "<TIMESTAMP>",'}
      </div>
      <div className="text-fg-tertiary">
        {'  // ... more fields, '}
        <a
          href={WEBHOOK_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-fg"
        >
          see docs
        </a>
      </div>
      <div>{'}'}</div>
    </div>
  </div>
)

export function WebhookAddEditDialogSteps({
  currentStep,
  form,
  isLoading,
  selectedEvents,
  exampleEventType,
  allEventsSelected,
  handleAllToggle,
  handleEventToggle,
  mode,
  hasCopied,
  onCopied,
}: WebhookAddEditDialogStepsProps) {
  const [secretType, setSecretType] = useState<'pre-generated' | 'custom'>(
    'pre-generated'
  )

  const preGeneratedSecret = useMemo(() => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => chars[byte % chars.length]).join('')
  }, [])

  const [copied, copy] = useClipboard(150)

  const customSecretInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (secretType !== 'custom') return
    const id = window.setTimeout(() => {
      customSecretInputRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [secretType])

  // sync secret with form state and validation - only in 'add' mode
  // in 'edit' mode, we should never touch the signature secret
  useEffect(() => {
    if (mode !== 'add') return

    if (secretType === 'pre-generated') {
      // set pre-generated secret and trigger validation to clear any errors
      form.setValue('signatureSecret', preGeneratedSecret, {
        shouldValidate: true,
        shouldDirty: true,
      })
      // explicitly clear any errors since pre-generated is always valid
      form.clearErrors('signatureSecret')
    } else {
      form.setValue('signatureSecret', '', {
        shouldValidate: true,
        shouldDirty: false,
      })
    }
  }, [mode, secretType, preGeneratedSecret, form])

  const handleCopy = async () => {
    await copy(preGeneratedSecret)
    setTimeout(onCopied, 150)
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {currentStep === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {/* Name Input */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel className="text-fg-tertiary">Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Example webhook"
                    disabled={isLoading}
                    className="min-w-0"
                    clearable
                    onClear={() => field.onChange('')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* URL Input */}
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel className="text-fg-tertiary">URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com/postreceive"
                    disabled={isLoading}
                    className="min-w-0"
                    clearable
                    onClear={() => field.onChange('')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Events Selection */}
          <FormField
            control={form.control}
            name="events"
            render={() => (
              <FormItem>
                <FormLabel className="text-fg-tertiary">
                  Received Lifecycle Events
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    {/* ALL checkbox */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="event-all"
                        checked={allEventsSelected}
                        onCheckedChange={handleAllToggle}
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="event-all"
                        className="cursor-pointer select-none"
                      >
                        ALL
                      </Label>
                    </div>

                    <Separator className="w-4" />

                    {/* Individual event checkboxes */}
                    {WEBHOOK_EVENTS.map((event) => (
                      <div key={event} className="flex items-center gap-2">
                        <Checkbox
                          id={`event-${event}`}
                          checked={selectedEvents.includes(event)}
                          onCheckedChange={() => handleEventToggle(event)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`event-${event}`}
                          className="cursor-pointer select-none"
                        >
                          {WEBHOOK_EVENT_LABELS[event]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-fg-tertiary prose-body wrap-break-word">
              We'll send a POST request with a JSON payload to{' '}
              <span className="break-all">
                {form.watch('url') || 'https://example.com/postreceive'}
              </span>{' '}
              for each event. Example:
            </p>
            <WebhookExamplePayload eventType={exampleEventType} />
          </div>
        </motion.div>
      )}

      {currentStep === 2 && (
        <motion.div
          key="step-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {/* Section Title and Description */}
          <div className="flex flex-col gap-2">
            <p className="text-fg-secondary prose-label uppercase">Secret</p>
            <p className="text-fg-tertiary prose-body">
              A secret verifies that webhooks are from us and untampered. Use
              our pre-generated one or add your own.
            </p>
          </div>

          {/* Tabs */}
          <Tabs
            value={secretType}
            onValueChange={(v) =>
              setSecretType(v as 'pre-generated' | 'custom')
            }
            className="min-h-0 w-full flex-1 h-full"
          >
            <TabsList className="w-full justify-start px-0">
              <TabsTrigger
                value="pre-generated"
                layoutkey="webhook-secret-tabs"
              >
                Pre-generated
              </TabsTrigger>
              <TabsTrigger value="custom" layoutkey="webhook-secret-tabs">
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Pre-generated Tab Content */}
            <TabsContent
              value="pre-generated"
              className="flex flex-col gap-2 mt-4"
            >
              <FormField
                control={form.control}
                name="signatureSecret"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1 items-start">
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          disabled={isLoading}
                          className="flex-1 min-w-0"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant={hasCopied ? 'secondary' : 'primary'}
                        onClick={handleCopy}
                        disabled={isLoading}
                        className="shrink-0 relative"
                      >
                        <span
                          className={copied ? 'invisible contents' : 'contents'}
                        >
                          <CopyIcon className="size-4" />
                          Copy
                        </span>
                        {copied && (
                          <CheckIcon className="absolute size-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <WarningIcon className="size-4 text-accent-warning-highlight shrink-0" />
                      <p className="text-fg-secondary prose-body">
                        Copy and store it now. You won't be able to view it
                        again.
                      </p>
                    </div>
                  </div>
                )}
              />
            </TabsContent>

            {/* Custom Tab Content */}
            <TabsContent value="custom" className="flex flex-col gap-2 mt-4">
              <FormField
                control={form.control}
                name="signatureSecret"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormControl>
                      <Input
                        placeholder="Enter your custom secret"
                        disabled={isLoading}
                        className="min-w-0"
                        {...field}
                        ref={(el) => {
                          field.ref(el)
                          customSecretInputRef.current = el
                        }}
                      />
                    </FormControl>
                    {form.formState.errors.signatureSecret ? (
                      <FormMessage />
                    ) : (
                      <p className="text-fg-tertiary prose-body">
                        {'> 32 characters'}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
