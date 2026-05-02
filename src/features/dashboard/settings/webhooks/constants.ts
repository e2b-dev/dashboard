export const WEBHOOK_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.killed',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'sandbox.lifecycle.created': 'CREATE',
  'sandbox.lifecycle.paused': 'PAUSE',
  'sandbox.lifecycle.resumed': 'RESUME',
  'sandbox.lifecycle.updated': 'UPDATE',
  'sandbox.lifecycle.killed': 'KILL',
}

export const WEBHOOK_DOCS_URL =
  'https://e2b.dev/docs/sandbox/lifecycle-events-webhooks'

export const WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL = `${WEBHOOK_DOCS_URL}#webhook-verification`
