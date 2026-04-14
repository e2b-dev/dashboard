import z from 'zod'

export const SandboxIdSchema = z
  .string()
  .min(1, 'Sandbox ID is required')
  .max(100, 'Sandbox ID too long')
  .regex(/^[a-z0-9]+$/, 'Invalid sandbox ID format')
