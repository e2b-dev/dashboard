const DEFAULT_TEMPLATE = 'base'
const TEMPLATE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/

export function normalizeTerminalTemplate(template?: string) {
  const value = template?.trim()

  if (!value) {
    return DEFAULT_TEMPLATE
  }

  if (!TEMPLATE_PATTERN.test(value)) {
    return null
  }

  return value
}
