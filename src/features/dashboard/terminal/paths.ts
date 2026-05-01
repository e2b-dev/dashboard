import { DEFAULT_CWD } from './constants'

export function normalizePath(path: string) {
  const absolutePath = path.startsWith('/') ? path : `${DEFAULT_CWD}/${path}`
  const parts: string[] = []

  for (const part of absolutePath.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }

  return `/${parts.join('/')}`
}

export function resolvePath(path: string, cwd: string) {
  if (!path || path === '~') return DEFAULT_CWD
  if (path.startsWith('~/'))
    return normalizePath(`${DEFAULT_CWD}/${path.slice(2)}`)
  if (path.startsWith('/')) return normalizePath(path)
  return normalizePath(`${cwd}/${path}`)
}

export function commonPrefix(values: string[]) {
  if (values.length === 0) return ''

  let prefix = values[0] ?? ''
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
  }

  return prefix
}
