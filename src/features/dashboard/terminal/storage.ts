import { TERMINAL_SESSION_STORAGE_PREFIX } from './constants'
import { normalizeTerminalTemplate } from './template'
import type { StoredTerminalSession } from './types'

function getTerminalSessionStorageKey(userId: string) {
  return `${TERMINAL_SESSION_STORAGE_PREFIX}:${userId}`
}

export function readStoredTerminalSession(userId: string) {
  try {
    const value = window.localStorage.getItem(
      getTerminalSessionStorageKey(userId)
    )
    if (!value) return null

    const session = JSON.parse(value) as Partial<StoredTerminalSession>
    if (typeof session.sandboxId !== 'string' || !session.sandboxId) {
      return null
    }

    const template =
      session.template === undefined
        ? 'base'
        : typeof session.template === 'string'
          ? normalizeTerminalTemplate(session.template)
          : null

    if (!template) return null

    return {
      sandboxId: session.sandboxId,
      template,
    }
  } catch {
    return null
  }
}

export function writeStoredTerminalSession(
  userId: string,
  session: StoredTerminalSession
) {
  window.localStorage.setItem(
    getTerminalSessionStorageKey(userId),
    JSON.stringify(session)
  )
}

export function clearStoredTerminalSession(userId: string) {
  window.localStorage.removeItem(getTerminalSessionStorageKey(userId))
}
