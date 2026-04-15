import { API_KEYS_LAST_USED_FIRST_COLLECTION_DATE } from '@/configs/versioning'
import type { TeamAPIKey } from '@/core/modules/keys/models'

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

/** Compact relative label for "last used" column; e.g. `new Date()` → `"0s ago"` */
export const formatShortRelativeAgo = (date: Date): string => {
  const now = Date.now()
  const t = date.getTime()
  const sec = Math.floor((now - t) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  const yr = Math.floor(day / 365)
  return `${yr}y ago`
}

/** Human line for last-used cell, matching legacy semantics for pre-collection keys. */
export const getLastUsedLabel = (apiKey: TeamAPIKey): string => {
  if (apiKey.lastUsed) return formatShortRelativeAgo(new Date(apiKey.lastUsed))

  const createdBefore =
    new Date(apiKey.createdAt).getTime() <
    API_KEYS_LAST_USED_FIRST_COLLECTION_DATE.getTime()

  if (createdBefore) return 'N/A'
  return 'Never'
}

/** ISO string for tooltips on last-used; e.g. `new Date()` → `"2025-09-29T14:18:49.000Z"` */
export const toIsoUtcString = (date: Date): string => date.toISOString()
