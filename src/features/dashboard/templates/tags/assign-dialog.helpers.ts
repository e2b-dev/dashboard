export const TAG_REGEX = /^[a-z0-9._-]+$/
export const TAG_MAX_LENGTH = 128
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeTagInput(raw: string): string {
  return raw.toLowerCase().replace(/\s/g, '-')
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function isValidTagShape(value: string): boolean {
  return (
    value.length > 0 && value.length <= TAG_MAX_LENGTH && TAG_REGEX.test(value)
  )
}

export function buildAssignTarget(
  templateName: string,
  buildId: string
): string {
  return `${templateName}:${buildId}`
}
