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
  const type = typeof value
  if (type === 'string') return `string(${(value as string).length})`
  if (type === 'object') return 'object'
  return type
}

/** Keep only explicitly allowlisted scalar values in observability output. */
export function sanitizeClientInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { _shape: describeValue(input) }
  }

  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const valueType = typeof value
    if (
      SAFE_INPUT_KEYS.has(key) &&
      (valueType === 'string' ||
        valueType === 'number' ||
        valueType === 'boolean')
    ) {
      output[key] = value
    } else {
      output[`_${key}`] = describeValue(value)
    }
  }
  return output
}
