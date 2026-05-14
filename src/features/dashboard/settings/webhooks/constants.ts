export const WEBHOOK_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.killed',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

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

export const WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL =
  'https://e2b.dev/docs/sandbox/lifecycle-events-webhooks#webhook-verification'
