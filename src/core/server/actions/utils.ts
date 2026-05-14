import { getPublicErrorMessage } from '@/core/shared/errors'

type ActionErrorOptions = {
  cause?: unknown
  expected?: boolean
}

export class ActionError extends Error {
  public expected: boolean
  public override cause?: unknown

  constructor(message: string, options: ActionErrorOptions = {}) {
    super(message)
    this.name = 'ActionError'
    this.expected = options.expected ?? true
    this.cause = options.cause
  }
}

export const returnServerError = (
  message: string,
  options?: ActionErrorOptions
) => {
  throw new ActionError(message, options)
}

export function handleDefaultInfraError(
  status: number,
  cause?: unknown
): never {
  return returnServerError(getPublicErrorMessage({ status }), {
    cause,
    expected: status < 500,
  })
}

export const flattenClientInputValue = (
  clientInput: unknown,
  key: string
): string | undefined => {
  if (typeof clientInput === 'object' && clientInput && key in clientInput) {
    return clientInput[key as keyof typeof clientInput]
  }

  return undefined
}

/**
 * Keys that are safe to log in cleartext from action inputs — IDs, slugs,
 * enums, and small flags. Any key not on this list is replaced with a type
 * hint (e.g. `string(64)`, `array(3)`, `object`) so we never leak raw values.
 *
 * Keep this list tight: prefer adding scoped per-action logging in the action
 * body over expanding this allowlist.
 */
const SAFE_INPUT_KEYS = new Set<string>([
  'teamSlug',
  'teamId',
  'templateId',
  'sandboxId',
  'userId',
  'webhookId',
  'organizationId',
  'page',
  'pageSize',
  'limit',
  'offset',
  'sortBy',
  'sortOrder',
  'mode',
  'kind',
  'type',
])

function describeValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `array(${value.length})`
  const t = typeof value
  if (t === 'string') return `string(${(value as string).length})`
  if (t === 'object') return 'object'
  return t
}

/**
 * Build a debug-safe summary of an action's clientInput.
 *
 * - Allowlisted scalar keys are inlined as-is.
 * - Everything else is replaced with `_<key>: <type-hint>` so shape and
 *   length are visible without leaking values.
 *
 * This is the inverse of the previous blocklist-via-pino-redaction approach:
 * new sensitive fields are safe by default and only become loggable when
 * explicitly added to {@link SAFE_INPUT_KEYS}.
 */
export function summarizeClientInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { _shape: describeValue(input) }
  }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const valueType = typeof value
    if (
      SAFE_INPUT_KEYS.has(key) &&
      (valueType === 'string' ||
        valueType === 'number' ||
        valueType === 'boolean')
    ) {
      out[key] = value
    } else {
      out[`_${key}`] = describeValue(value)
    }
  }
  return out
}
