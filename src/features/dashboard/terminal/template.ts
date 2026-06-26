const DEFAULT_TEMPLATE = 'base'
const TEMPLATE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/

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

export function resolveTerminalTemplateOverride(
  template: string | undefined,
  fallback: string
) {
  if (template === undefined) return fallback

  return normalizeTerminalTemplate(template)
}

export function getTerminalTemplateProvider(template: string) {
  const separatorIndex = template.lastIndexOf('/')

  if (separatorIndex <= 0) {
    return null
  }

  return template.slice(0, separatorIndex)
}

export function isTrustedTemplateProvider(
  provider: string,
  trustedProviders: readonly string[]
) {
  const normalizedProvider = provider.trim().toLowerCase()
  if (!normalizedProvider) return true

  return trustedProviders.some(
    (trustedProvider) =>
      trustedProvider.trim().toLowerCase() === normalizedProvider
  )
}

export function getUntrustedTerminalTemplateProvider(
  template: string,
  trustedProviders: readonly string[]
) {
  const provider = getTerminalTemplateProvider(template)

  if (!provider || isTrustedTemplateProvider(provider, trustedProviders)) {
    return undefined
  }

  return provider
}
