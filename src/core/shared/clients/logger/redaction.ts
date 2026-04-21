const TOP_LEVEL_REDACTION_KEYS = [
  'password',
  'confirmPassword',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'apikey',
  'captchaToken',
  'captcha_token',
  'authorization',
  'Authorization',
  'cookie',
  'Cookie',
  'tokenHash',
  'token_hash',
] as const

const NESTED_ONLY_REDACTION_KEYS = ['key', 'sandboxIds'] as const

const MAX_NESTED_REDACTION_DEPTH = 3

function buildNestedRedactionPaths(
  keys: readonly string[],
  maxDepth: number
): string[] {
  const nestedPaths: string[] = []

  for (const key of keys) {
    for (let depth = 1; depth <= maxDepth; depth++) {
      nestedPaths.push(`${Array(depth).fill('*').join('.')}.${key}`)
    }
  }

  return nestedPaths
}

export const REDACTION_CENSOR = '[Redacted]'

export const REDACTION_PATHS = [
  ...new Set([
    ...TOP_LEVEL_REDACTION_KEYS,
    ...buildNestedRedactionPaths(
      [...TOP_LEVEL_REDACTION_KEYS, ...NESTED_ONLY_REDACTION_KEYS],
      MAX_NESTED_REDACTION_DEPTH
    ),
  ]),
]
