'use client'

import { useState } from 'react'
import { CodeBlock } from '@/ui/code-block'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL } from './constants'

const WEBHOOK_VERIFICATION_SNIPPETS = {
  javascript: `import crypto from 'crypto'

function verifyWebhookSignature(secret : string, payload : string, payloadSignature : string) {
    const expectedSignatureRaw = crypto.createHash('sha256').update(secret + payload).digest('base64');
    const expectedSignature = expectedSignatureRaw.replace(/=+$/, '');
    return  expectedSignature == payloadSignature
}

const payloadValid = verifyWebhookSignature(secret, webhookBodyRaw, webhookSignatureHeader)
if (payloadValid) {
    console.log("Payload signature is valid")
} else {
    console.log("Payload signature is INVALID")
}`,
  python: `import hashlib
import base64

def verify_webhook_signature(secret: str, payload: str, payload_signature: str) -> bool:
    hash_bytes = hashlib.sha256((secret + payload).encode('utf-8')).digest()
    expected_signature = base64.b64encode(hash_bytes).decode('utf-8')
    expected_signature = expected_signature.rstrip('=')

    return expected_signature == payload_signature

if verify_webhook_signature(secret, webhook_body_raw, webhook_signature_header):
    print("Payload signature is valid")
else:
    print("Payload signature is INVALID")`,
}

type WebhookVerificationLanguage = keyof typeof WEBHOOK_VERIFICATION_SNIPPETS

const WEBHOOK_VERIFICATION_LANGUAGE_LABELS: Record<
  WebhookVerificationLanguage,
  string
> = {
  javascript: 'JavaScript',
  python: 'Python',
}

// Checks if a tab value is a snippet language; "python" -> true, "go" -> false.
const isWebhookVerificationLanguage = (
  value: string
): value is WebhookVerificationLanguage =>
  value === 'javascript' || value === 'python'

type FinishWebhookSetupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const FinishWebhookSetupDialog = ({
  open,
  onOpenChange,
}: FinishWebhookSetupDialogProps) => {
  const [language, setLanguage] =
    useState<WebhookVerificationLanguage>('javascript')

  const handleLanguageChange = (value: string) => {
    if (isWebhookVerificationLanguage(value)) setLanguage(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[685px] max-h-[calc(100svh-2rem)] flex-col gap-4 overflow-hidden px-6 pt-5 pb-6">
        <DialogHeader className="gap-0.5">
          <DialogTitle>Finish Webhook Setup</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-fg-secondary prose-label uppercase">
              Secret Use
            </p>
            <p className="text-fg-tertiary prose-body">
              Use the snippet below to verify the secret when your webhook is
              called.{' '}
              <a
                href={WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-fg"
              >
                Read more in the docs.
              </a>
            </p>
          </div>

          <Tabs
            value={language}
            onValueChange={handleLanguageChange}
            className="min-h-0 flex-1"
          >
            <TabsList className="h-9 w-full gap-0 border-b-0 p-0 max-md:px-0 [&>div]:flex-1">
              {Object.entries(WEBHOOK_VERIFICATION_LANGUAGE_LABELS).map(
                ([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    layoutkey="webhook-verification-tabs"
                    className="h-9 w-full border border-stroke bg-transparent pb-0 data-[state=active]:bg-bg-hover"
                  >
                    <span className="font-mono text-[10px] uppercase">
                      {value === 'javascript' ? 'JS' : 'PY'}
                    </span>
                    {label}
                  </TabsTrigger>
                )
              )}
            </TabsList>

            {Object.entries(WEBHOOK_VERIFICATION_SNIPPETS).map(
              ([value, snippet]) => (
                <TabsContent key={value} value={value} className="mt-0 min-h-0">
                  <CodeBlock
                    lang={value}
                    className="h-full min-h-[360px]"
                    viewportProps={{ className: 'max-h-[442px]' }}
                  >
                    {snippet}
                  </CodeBlock>
                </TabsContent>
              )
            )}
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Finish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
