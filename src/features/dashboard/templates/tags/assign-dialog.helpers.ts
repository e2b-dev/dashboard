export const TAG_REGEX = /^[a-z0-9._-]+$/
export const TAG_MAX_LENGTH = 128
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mirrors the infra `id.ValidateAndDeduplicateTags` normalization on the
 * client so the input value the user sees matches what the server will
 * persist: lowercase + every whitespace character replaced with `-`.
 */
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

/**
 * Builds the infra POST `target` field. The dashboard handler accepts a
 * UUID in the tag slot via `try_cast_uuid` in
 * `get_template_with_build_by_tag.sql`, so we anchor by build ID directly.
 */
export function buildAssignTarget(
  templateName: string,
  buildId: string
): string {
  return `${templateName}:${buildId}`
}
