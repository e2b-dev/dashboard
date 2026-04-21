import { z } from 'zod'

const SANDBOX_LIFECYCLE_EVENT_TYPE_VALUES: [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.killed',
] = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.killed',
]

const SANDBOX_LIFECYCLE_EVENT_URL_VALUES: [
  'created',
  'updated',
  'paused',
  'resumed',
  'killed',
] = ['created', 'updated', 'paused', 'resumed', 'killed']

const sandboxLifecycleEventTypeSchema = z.enum(
  SANDBOX_LIFECYCLE_EVENT_TYPE_VALUES
)
const sandboxLifecycleEventUrlValueSchema = z.enum(
  SANDBOX_LIFECYCLE_EVENT_URL_VALUES
)

type SandboxLifecycleEventType = z.infer<typeof sandboxLifecycleEventTypeSchema>
type SandboxLifecycleEventUrlValue = z.infer<
  typeof sandboxLifecycleEventUrlValueSchema
>

const SANDBOX_LIFECYCLE_EVENT_LABELS: Record<
  SandboxLifecycleEventType,
  string
> = {
  'sandbox.lifecycle.created': 'Created',
  'sandbox.lifecycle.updated': 'Updated',
  'sandbox.lifecycle.paused': 'Paused',
  'sandbox.lifecycle.resumed': 'Resumed',
  'sandbox.lifecycle.killed': 'Killed',
}

const SANDBOX_LIFECYCLE_EVENT_TYPE_TO_URL_VALUE: Record<
  SandboxLifecycleEventType,
  SandboxLifecycleEventUrlValue
> = {
  'sandbox.lifecycle.created': 'created',
  'sandbox.lifecycle.updated': 'updated',
  'sandbox.lifecycle.paused': 'paused',
  'sandbox.lifecycle.resumed': 'resumed',
  'sandbox.lifecycle.killed': 'killed',
}

const SANDBOX_LIFECYCLE_EVENT_URL_VALUE_TO_TYPE: Record<
  SandboxLifecycleEventUrlValue,
  SandboxLifecycleEventType
> = {
  created: 'sandbox.lifecycle.created',
  updated: 'sandbox.lifecycle.updated',
  paused: 'sandbox.lifecycle.paused',
  resumed: 'sandbox.lifecycle.resumed',
  killed: 'sandbox.lifecycle.killed',
}

/** Returns a lifecycle event label. Example: "sandbox.lifecycle.created" -> "Created". */
const getSandboxLifecycleEventLabel = (type: string) => {
  const parsedType = sandboxLifecycleEventTypeSchema.safeParse(type)
  if (!parsedType.success) return type
  return SANDBOX_LIFECYCLE_EVENT_LABELS[parsedType.data]
}

const getSandboxLifecycleEventTypeFromUrlValue = (value: string | null) => {
  if (!value) return null

  const parsedUrlValue = sandboxLifecycleEventUrlValueSchema.safeParse(value)
  if (parsedUrlValue.success) {
    return SANDBOX_LIFECYCLE_EVENT_URL_VALUE_TO_TYPE[parsedUrlValue.data]
  }

  const parsedType = sandboxLifecycleEventTypeSchema.safeParse(value)
  if (parsedType.success) {
    return parsedType.data
  }

  return null
}

const getSandboxLifecycleEventUrlValue = (type: SandboxLifecycleEventType) =>
  SANDBOX_LIFECYCLE_EVENT_TYPE_TO_URL_VALUE[type]

export { getSandboxLifecycleEventLabel, getSandboxLifecycleEventTypeFromUrlValue, getSandboxLifecycleEventUrlValue, SANDBOX_LIFECYCLE_EVENT_LABELS, SANDBOX_LIFECYCLE_EVENT_TYPE_VALUES, SANDBOX_LIFECYCLE_EVENT_URL_VALUES, sandboxLifecycleEventTypeSchema, sandboxLifecycleEventUrlValueSchema, type SandboxLifecycleEventType, type SandboxLifecycleEventUrlValue }
