export const DEFAULT_TERMINAL_ENV_VAR_NAMES_BY_TEMPLATE: Record<
  string,
  string[]
> = {}

const ENV_VAR_NAME_PATTERN = /^[A-Z_][A-Z0-9_]{0,127}$/
const ENV_VAR_ENTRY_DELIMITERS = ['=', ':']

export function getDefaultTerminalEnvVarNames(template: string) {
  return DEFAULT_TERMINAL_ENV_VAR_NAMES_BY_TEMPLATE[template] ?? []
}

export function normalizeTerminalEnvVarName(name: string) {
  const value = name.trim().toUpperCase()

  if (!ENV_VAR_NAME_PATTERN.test(value)) return null

  return value
}

export function mergeTerminalEnvVarNames(...nameLists: Array<string[]>) {
  return [
    ...new Set(
      nameLists
        .flat()
        .map((name) => normalizeTerminalEnvVarName(name))
        .filter((name): name is string => Boolean(name))
    ),
  ]
}

export function parseTerminalEnvVarEntry(entry: string) {
  const delimiterIndex = findFirstDelimiterIndex(entry)
  if (delimiterIndex === -1) return null

  const name = normalizeTerminalEnvVarName(entry.slice(0, delimiterIndex))
  const value = entry.slice(delimiterIndex + 1)

  if (!name || value.length === 0) return null

  return {
    name,
    value,
  }
}

function findFirstDelimiterIndex(value: string) {
  return ENV_VAR_ENTRY_DELIMITERS.reduce((firstIndex, delimiter) => {
    const delimiterIndex = value.indexOf(delimiter)
    if (delimiterIndex === -1) return firstIndex
    if (firstIndex === -1) return delimiterIndex

    return Math.min(firstIndex, delimiterIndex)
  }, -1)
}
