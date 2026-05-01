import type { KeyboardEvent } from 'react'

export function isClipboardShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c'
}

export function isPasteShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v'
}
