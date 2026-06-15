'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import ShikiHighlighter from 'react-shiki'
import { z } from 'zod'
import { useShikiTheme } from '@/configs/shiki'
import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import type { UpsertWebhookFormInput } from '@/core/server/functions/webhooks/schema'
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
import {
  CheckmarkIcon,
  CopyIcon,
  ExternalLinkIcon,
  WarningIcon,
} from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { Separator } from '@/ui/primitives/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import {
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EXAMPLE_PAYLOAD,
  WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL,
} from './constants'

const SecretTypeSchema = z.enum(['pre-generated', 'custom'])

export type SecretType = z.infer<typeof SecretTypeSchema>

type UpsertWebhookDialogStepsProps = {
  currentStep: number
  form: UseFormReturn<UpsertWebhookFormInput>
  isLoading: boolean
  selectedEvents: string[]
  exampleEventType: SandboxLifecycleEventType
  allEventsSelected: boolean
  handleAllToggle: () => void
  handleEventToggle: (event: SandboxLifecycleEventType) => void
  mode: 'create' | 'update'
  hasCopiedSecret: boolean
  setHasCopiedSecret: (value: boolean) => void
  preGeneratedSecret: string
  secretType: SecretType
  onSecretTypeChange: (value: SecretType) => void
}

export function UpsertWebhookDialogSteps({
  currentStep,
  form,
  isLoading,
  selectedEvents,
  exampleEventType,
  allEventsSelected,
  handleAllToggle,
  handleEventToggle,
  mode,
  hasCopiedSecret,
  setHasCopiedSecret,
  preGeneratedSecret,
  secretType,
  onSecretTypeChange,
}: UpsertWebhookDialogStepsProps) {
  const shikiTheme = useShikiTheme()
  const [secretCopiedFeedback, copySecret] = useClipboard()

  const customSecretInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (secretType !== 'custom') return
    const id = window.setTimeout(() => {
      customSecretInputRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [secretType])

  const handleSecretTypeChange = (value: string) => {
    const parsed = SecretTypeSchema.safeParse(value)
    if (!parsed.success) return

    onSecretTypeChange(parsed.data)

    if (mode !== 'create') return

    if (parsed.data === 'pre-generated') {
      form.setValue('signatureSecret', preGeneratedSecret, {
        shouldValidate: true,
        shouldDirty: true,
      })
      form.clearErrors('signatureSecret')
    } else {
      form.setValue('signatureSecret', '', {
        shouldValidate: true,
        shouldDirty: false,
      })
    }
  }

  const handleCopySecret = () => {
    void copySecret(preGeneratedSecret)
    setHasCopiedSecret(true)
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
                    {SandboxLifecycleEventTypeSchema.options.map((event) => (
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
            <p className="text-fg-tertiary prose-body break-words">
              We'll send a POST request with a JSON payload to{' '}
              <span className="break-all text-fg">
                {form.watch('url') || 'https://example.com/postreceive'}
              </span>{' '}
              for each event. Example:
            </p>
            <div className="border overflow-hidden w-full">
              <ScrollArea>
                <ShikiHighlighter
                  language="json"
                  theme={shikiTheme}
                  className="px-3 py-2 text-xs"
                  addDefaultStyles={false}
                  showLanguage={false}
                >
                  {WEBHOOK_EXAMPLE_PAYLOAD.replace(
                    '"sandbox.lifecycle.created"',
                    `"${exampleEventType}"`
                  )}
                </ShikiHighlighter>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
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
            <p className="text-fg-secondary prose-label uppercase">
              Signature Secret
            </p>
            <p className="text-fg-tertiary prose-body">
              This secret is used to verify webhook authenticity. Each request
              includes an <code className="text-fg">e2b-signature</code> header
              generated with Hash-based Message Authentication Code (HMAC)
              SHA-256. Validate this in your endpoint to ensure requests are
              from E2B and untampered.
            </p>
            <a
              href={WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-link hover:text-fg-link-hover prose-body inline-flex items-center gap-1 w-fit"
            >
              View validation examples
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>

          {/* Tabs */}
          <Tabs
            value={secretType}
            onValueChange={handleSecretTypeChange}
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
                        variant={hasCopiedSecret ? 'secondary' : 'primary'}
                        onClick={handleCopySecret}
                        disabled={isLoading}
                        className="shrink-0 relative"
                      >
                        <span
                          className={
                            secretCopiedFeedback
                              ? 'invisible contents'
                              : 'contents'
                          }
                        >
                          <CopyIcon className="size-4" />
                          Copy
                        </span>
                        {secretCopiedFeedback && (
                          <CheckmarkIcon className="absolute size-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
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
                        minLength={32}
                        className="min-w-0"
                        clearable
                        onClear={() => field.onChange('')}
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
