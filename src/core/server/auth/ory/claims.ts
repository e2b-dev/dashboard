import 'server-only'

export function formatOidcNameClaim(value: unknown): string | null {
  if (typeof value === 'string') {
    const name = value.trim()
    return name || null
  }

  if (!value || typeof value !== 'object') return null

  const { first, last } = value as { first?: unknown; last?: unknown }
  const name = [first, last]
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return name || null
}
