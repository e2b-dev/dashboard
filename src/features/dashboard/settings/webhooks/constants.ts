import type { SandboxLifecycleEventType } from '@/core/modules/sandboxes/lifecycle-event-types'

export const WEBHOOK_EVENT_LABELS: Record<SandboxLifecycleEventType, string> = {
  'sandbox.lifecycle.created': 'CREATE',
  'sandbox.lifecycle.paused': 'PAUSE',
  'sandbox.lifecycle.resumed': 'RESUME',
  'sandbox.lifecycle.updated': 'UPDATE',
  'sandbox.lifecycle.killed': 'KILL',
}

export const WEBHOOK_DOCS_URL =
  'https://e2b.dev/docs/sandbox/lifecycle-events-webhooks'

export const WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL = `${WEBHOOK_DOCS_URL}#webhook-verification`
