export interface TerminalPtyOptions {
  cwd?: string
  envs?: Record<string, string>
  user?: string
}

type TerminalPtySearchParams = Record<string, string | string[] | undefined>

export function normalizePtyOptions(options: TerminalPtyOptions) {
  const user = options.user?.trim()
  const cwd = options.cwd?.trim()
  const envs = options.envs
    ? Object.fromEntries(
        Object.entries(options.envs).filter(
          ([key, value]) => key.trim() && value !== undefined
        )
      )
    : undefined

  return {
    ...(user ? { user } : {}),
    ...(cwd ? { cwd } : {}),
    ...(envs && Object.keys(envs).length > 0 ? { envs } : {}),
  }
}

export function formatEnvVars(envs: TerminalPtyOptions['envs']) {
  if (!envs) return ''

  return Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

export function parseEnvVars(value: string) {
  const envs: Record<string, string> = {}

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue

    const key = trimmed.slice(0, separator).trim()
    if (!key) continue

    envs[key] = trimmed.slice(separator + 1)
  }

  return Object.keys(envs).length > 0 ? envs : undefined
}

export function parsePtyOptionsFromSearchParams(
  searchParams: TerminalPtySearchParams
) {
  return normalizePtyOptions({
    user: readFirstSearchParam(searchParams, 'user'),
    cwd: readFirstSearchParam(searchParams, 'cwd'),
    envs: parseEnvSearchParams(searchParams),
  })
}

export function hasPtyOptionsSearchParams(
  searchParams: TerminalPtySearchParams
) {
  return ['user', 'cwd', 'env'].some((key) => {
    const value = searchParams[key]
    return Array.isArray(value) ? value.length > 0 : value !== undefined
  })
}

function readFirstSearchParam(
  searchParams: TerminalPtySearchParams,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = searchParams[key]
    if (Array.isArray(value)) {
      const firstValue = value.find(Boolean)
      if (firstValue) return firstValue
      continue
    }
    if (value) return value
  }
}

function parseEnvSearchParams(searchParams: TerminalPtySearchParams) {
  const entries = readSearchParamValues(searchParams, 'env')
  const envs: Record<string, string> = {}

  for (const entry of entries) {
    const separator = entry.indexOf('=')
    if (separator <= 0) continue

    const key = entry.slice(0, separator).trim()
    if (!key) continue

    envs[key] = entry.slice(separator + 1)
  }

  return Object.keys(envs).length > 0 ? envs : undefined
}

function readSearchParamValues(
  searchParams: TerminalPtySearchParams,
  key: string
) {
  const value = searchParams[key]
  if (!value) return []

  return Array.isArray(value) ? value : [value]
}
