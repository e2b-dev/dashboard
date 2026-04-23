import { z } from 'zod'

const SandboxLifecycleEventTypeSchema = z.enum([
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.killed',
])

type SandboxLifecycleEventType = z.infer<typeof SandboxLifecycleEventTypeSchema>

export { SandboxLifecycleEventTypeSchema, type SandboxLifecycleEventType }
