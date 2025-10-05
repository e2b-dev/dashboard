import z from 'zod'

/**
 * Sandbox ID validation schema
 * Accepts standard sandbox ID format (alphanumeric characters)
 * Maximum length of 100 characters to prevent DoS attacks
 * Example: i08krhnahpx21arf83wmz
 */
export const SandboxIdSchema = z
  .string()
  .min(1, 'Sandbox ID is required')
  .max(100, 'Sandbox ID too long')
  .regex(/^[a-z0-9]+$/, 'Invalid sandbox ID format')
