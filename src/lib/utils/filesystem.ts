import { FileContentState } from '@/features/dashboard/sandbox/inspect/filesystem/store'

// Leverage pathe (a tiny, browser-friendly path replacement)
import { basename, dirname, join, normalize } from 'pathe'

/**
 * Normalize a path so that it:
 *   • always starts with "/" (root-relative)
 *   • has duplicate slashes removed
 *   • resolves . and .. segments
 */
export function normalizePath(path: string): string {
  if (!path) return '/'

  return normalize(path)
}

/** Get the parent directory of a path */
export function getParentPath(path: string): string {
  const norm = normalizePath(path)

  return norm === '/' ? '/' : dirname(norm) || '/'
}

/** Get the basename (filename) of a path */
export function getBasename(path: string): string {
  const norm = normalizePath(path)

  return norm === '/' ? '/' : basename(norm)
}

/** Join path segments together */
export function joinPath(...segments: (string | null | undefined)[]): string {
  if (segments.length === 0) return '/'
  const filtered = segments.filter(
    (s): s is string => s !== '' && s !== null && s !== undefined
  )
  return normalizePath(join(...filtered))
}

/** Check if a path is a strict child of another path */
export function isChildPath(parentPath: string, childPath: string): boolean {
  const parent = normalizePath(parentPath)
  const child = normalizePath(childPath)
  if (parent === child) return false

  const parentWithSlash = parent === '/' ? '/' : `${parent}/`
  return child.startsWith(parentWithSlash)
}

/** Get the depth of a path (number of directory levels) */
export function getPathDepth(path: string): number {
  const norm = normalizePath(path)
  return norm === '/' ? 0 : norm.split('/').length - 1
}

/** Check if a path is the root path */
export function isRootPath(path: string): boolean {
  return normalizePath(path) === '/'
}

// ---------------------------------------------------------------------------
// Binary/text blob helpers (unchanged)
// ---------------------------------------------------------------------------

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
