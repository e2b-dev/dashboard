import type { DevelopmentConnection } from '@/core/modules/feature-flags/definitions'

export type ConnectionCatalogEntry = DevelopmentConnection

export const DECLARED_CONNECTIONS: readonly ConnectionCatalogEntry[] = []

export function mergeConnectionCatalog(
  declared: readonly ConnectionCatalogEntry[],
  additional: readonly ConnectionCatalogEntry[]
): ConnectionCatalogEntry[] {
  const catalog = [...declared]
  const templates = new Set(declared.map((connection) => connection.template))

  for (const connection of additional) {
    if (templates.has(connection.template)) {
      continue
    }

    catalog.push(connection)
    templates.add(connection.template)
  }

  return catalog
}
