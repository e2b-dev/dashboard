import { FileContentState } from '@/features/dashboard/sandbox/inspect/filesystem/store'

/**
 * Normalize a path by removing duplicate slashes and resolving . and .. segments
 */
export function normalizePath(path: string): string {
  // Handle empty path
  if (!path || path === '') return '/'

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path
  }

  // Split path into segments
  const segments = path
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.')
  const normalized: string[] = []

  for (const segment of segments) {
    if (segment === '..') {
      // Pop the last segment if we have one (don't go above root)
      if (normalized.length > 0) {
        normalized.pop()
      }
    } else {
      normalized.push(segment)
    }
  }

  // Join segments back together
  const result = '/' + normalized.join('/')

  // Ensure we don't return empty string, always at least '/'
  return result === '' ? '/' : result
}

/**
 * Get the parent directory of a path
 */
export function getParentPath(path: string): string {
  const normalized = normalizePath(path)
  if (normalized === '/') return '/'

  const lastSlashIndex = normalized.lastIndexOf('/')
  if (lastSlashIndex === 0) return '/'

  return normalized.substring(0, lastSlashIndex)
}

/**
 * Get the basename (filename) of a path
 */
export function getBasename(path: string): string {
  const normalized = normalizePath(path)
  if (normalized === '/') return '/'

  const lastSlashIndex = normalized.lastIndexOf('/')
  return normalized.substring(lastSlashIndex + 1)
}

/**
 * Join path segments together
 */
export function joinPath(...segments: string[]): string {
  if (segments.length === 0) return '/'

  const joined = segments
    .filter((segment) => segment !== '' && segment != null)
    .join('/')

  return normalizePath(joined)
}

/**
 * Check if a path is a child of another path
 */
export function isChildPath(parentPath: string, childPath: string): boolean {
  const normalizedParent = normalizePath(parentPath)
  const normalizedChild = normalizePath(childPath)

  if (normalizedParent === normalizedChild) return false

  // Ensure parent ends with / for proper comparison
  const parentWithSlash =
    normalizedParent === '/' ? '/' : normalizedParent + '/'

  return normalizedChild.startsWith(parentWithSlash)
}

/**
 * Get the depth of a path (number of directory levels)
 */
export function getPathDepth(path: string): number {
  const normalized = normalizePath(path)
  if (normalized === '/') return 0

  return normalized.split('/').length - 1
}

/**
 * Check if a path is the root path
 */
export function isRootPath(path: string): boolean {
  return normalizePath(path) === '/'
}

export async function determineFileContentState(
  blob: Blob
): Promise<FileContentState> {
  const mimeType = blob.type ?? ''

  try {
    if (mimeType.startsWith('image/')) {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })

      return { type: 'image', dataUri }
    }

    const buffer = await blob.arrayBuffer()
    const data = new Uint8Array(buffer)

    const content = new TextDecoder('utf-8', { fatal: true }).decode(data)
    return { type: 'text', text: content }
  } catch {
    return { type: 'unreadable' }
  }
}
