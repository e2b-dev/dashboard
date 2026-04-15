import { API_KEYS_LAST_USED_FIRST_COLLECTION_DATE } from '@/configs/versioning'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { formatRelativeAgo } from '@/lib/utils/formatting'

/** Builds a short masked id string for search and display; e.g. input mask fields → `"e2b_…a1b2"` */
export const getMaskedIdSearchString = (apiKey: TeamAPIKey): string => {
  const { prefix, maskedValuePrefix, maskedValueSuffix } = apiKey.mask
  return `${prefix}${maskedValuePrefix}...${maskedValueSuffix}`.toLowerCase()
}

/** Returns true when the key name or masked id contains the trimmed query (case-insensitive). */
export const matchesApiKeySearch = (
  apiKey: TeamAPIKey,
  query: string
): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (apiKey.name.toLowerCase().includes(q)) return true
  return getMaskedIdSearchString(apiKey).includes(q)
}

/** Human line for last-used cell, matching legacy semantics for pre-collection keys. */
export const getLastUsedLabel = (apiKey: TeamAPIKey): string => {
  if (apiKey.lastUsed) return formatRelativeAgo(new Date(apiKey.lastUsed))

  const createdBefore =
    new Date(apiKey.createdAt).getTime() <
    API_KEYS_LAST_USED_FIRST_COLLECTION_DATE.getTime()

  if (createdBefore) return 'N/A'
  return 'Never'
}
