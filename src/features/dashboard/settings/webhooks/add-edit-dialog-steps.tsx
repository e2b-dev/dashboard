'use client'

import { useShikiTheme } from '@/configs/shiki'
import { UpsertWebhookSchemaType } from '@/server/webhooks/schema'
import { Button } from '@/ui/primitives/button'
import { Checkbox } from '@/ui/primitives/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { CopyIcon, ExternalLinkIcon, WarningIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { Separator } from '@/ui/primitives/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import ShikiHighlighter from 'react-shiki'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EXAMPLE_PAYLOAD,
  WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL,
} from './constants'

type WebhookAddEditDialogStepsProps = {
  currentStep: number
  form: UseFormReturn<UpsertWebhookSchemaType>
  isLoading: boolean
  selectedEvents: string[]
  allEventsSelected: boolean
  handleAllToggle: () => void
  handleEventToggle: (event: string) => void
}

export function WebhookAddEditDialogSteps({
  currentStep,
  form,
  isLoading,
  selectedEvents,
  allEventsSelected,
  handleAllToggle,
  handleEventToggle,
}: WebhookAddEditDialogStepsProps) {
  const shikiTheme = useShikiTheme()
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

  const [copied, setCopied] = useState(false)

  // sync secret with form state and validation
  useEffect(() => {
    if (secretType === 'pre-generated') {
      // set pre-generated secret and trigger validation to clear any errors
      form.setValue('signatureSecret', preGeneratedSecret, {
        shouldValidate: true,
        shouldDirty: true,
      })
      // explicitly clear any errors since pre-generated is always valid
      form.clearErrors('signatureSecret')
    } else {
      // clear for custom input
      form.setValue('signatureSecret', '', {
        shouldValidate: false,
        shouldDirty: false,
      })
    }
  }, [secretType, preGeneratedSecret, form])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preGeneratedSecret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
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
                          {event}
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
                  {WEBHOOK_EXAMPLE_PAYLOAD}
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
              includes an <code className="text-fg">x-e2b-signature</code>{' '}
              header generated with HMAC SHA-256. Validate this in your endpoint
              to ensure requests are from E2B and untampered.
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
                        onClick={handleCopy}
                        disabled={isLoading}
                        className="shrink-0"
                      >
                        <CopyIcon className="size-4" />
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <div className="flex gap-2 items-start">
                      <WarningIcon className="size-4 text-accent-warning-highlight shrink-0 mt-0.5" />
                      <p className="text-fg-secondary prose-body">
                        Store this secret securely. You won't be able to view it
                        again after creating the webhook.
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
                      />
                    </FormControl>
                    <p className="text-fg-tertiary prose-body">
                      {'> 32 characters'}
                    </p>
                    <FormMessage />
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
