import type { SandboxLifecycleEventType } from '@/core/modules/sandboxes/lifecycle-event-types'

export const WEBHOOK_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.killed',
] satisfies SandboxLifecycleEventType[]

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WEBHOOK_EVENT_LABELS: Record<SandboxLifecycleEventType, string> = {
  'sandbox.lifecycle.created': 'CREATE',
  'sandbox.lifecycle.paused': 'PAUSE',
  'sandbox.lifecycle.resumed': 'RESUME',
  'sandbox.lifecycle.updated': 'UPDATE',
  'sandbox.lifecycle.killed': 'KILL',
}

export const WEBHOOK_DOCS_URL =
  'https://e2b.dev/docs/sandbox/lifecycle-events-webhooks'

export const WEBHOOK_EXAMPLE_PAYLOAD = `{
  "id": "<UUID>",
  "version": "v2",
  "type": "sandbox.lifecycle.created",
  "timestamp": "<ISO_8601_TIMESTAMP>",
  "event_category": "lifecycle",
  "event_label": "create",
  "sandbox_id": "<SANDBOX_ID>",
  "sandbox_execution_id": "<UUID>",
  "sandbox_template_id": "<TEMPLATE_ID>",
  "sandbox_build_id": "<UUID>",
  "sandbox_team_id": "<UUID>"
}

// Payload structure may vary by event type.
// See docs for full schema.`

export const WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL = `${WEBHOOK_DOCS_URL}#webhook-verification`
