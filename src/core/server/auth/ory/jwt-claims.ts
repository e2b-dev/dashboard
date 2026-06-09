export function decodeJwtClaims<T = Record<string, unknown>>(
  token: string
): T | null {
  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export function tokenFormat(token: string): 'jwt' | 'opaque' | 'empty' {
  if (!token) return 'empty'
  return token.split('.').length === 3 ? 'jwt' : 'opaque'
}

// Reads a non-empty string claim, trimming surrounding whitespace.
export function readStringClaim(
  claims: Record<string, unknown> | null | undefined,
  name: string
): string | null {
  const value = claims?.[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}
