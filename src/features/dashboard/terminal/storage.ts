import { TERMINAL_SESSION_STORAGE_PREFIX } from './constants'
import { normalizeTerminalTemplate } from './template'
import type { StoredTerminalSession } from './types'

// OSS: single-key deployment; sessions are keyed per browser, not per user.
function getTerminalSessionStorageKey() {
  return TERMINAL_SESSION_STORAGE_PREFIX
}

export function readStoredTerminalSession() {
  try {
    const value = window.localStorage.getItem(getTerminalSessionStorageKey())
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

export function writeStoredTerminalSession(session: StoredTerminalSession) {
  try {
    window.localStorage.setItem(
      getTerminalSessionStorageKey(),
      JSON.stringify(session)
    )
  } catch {
    // Terminal launch should still succeed if browser storage is unavailable.
  }
}

export function clearStoredTerminalSession() {
  try {
    window.localStorage.removeItem(getTerminalSessionStorageKey())
  } catch {
    // Best-effort cleanup for unavailable or blocked browser storage.
  }
}
