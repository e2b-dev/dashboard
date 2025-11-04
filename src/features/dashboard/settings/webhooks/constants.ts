export const WEBHOOK_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.killed',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WEBHOOK_EXAMPLE_PAYLOAD = `{
  "version": "v1",
  "id": "<UUID>",
  "type": "sandbox.lifecycle.created",
  "eventData": null,
  "sandboxBuildId": "<UUID>",
  "sandboxExecutionId": "<UUID>",
  "sandboxId": "<SANDBOX_ID>",
  "sandboxTeamId": "<UUID>",
  "sandboxTemplateId": "<TEMPLATE_ID>",
  "timestamp": "<ISO_8601_TIMESTAMP>"
}

// Payload structure may vary by event type. 
// See docs for full schema.`

export const WEBHOOK_SIGNATURE_VALIDATION_DOCS_URL =
  'https://e2b.dev/docs/sandbox/lifecycle-events-webhooks#webhook-request-headers'
