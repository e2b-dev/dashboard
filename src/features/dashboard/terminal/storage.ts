import {
  TERMINAL_PTY_SETTINGS_STORAGE_PREFIX,
  TERMINAL_SESSION_STORAGE_PREFIX,
} from './constants'
import type { TerminalPtyOptions } from './pty-options'
import { normalizeTerminalTemplate } from './template'
import type { StoredTerminalSession } from './types'

function getTerminalSessionStorageKey(userId: string) {
  return `${TERMINAL_SESSION_STORAGE_PREFIX}:${userId}`
}

function getTerminalPtySettingsStorageKey(userId: string) {
  return `${TERMINAL_PTY_SETTINGS_STORAGE_PREFIX}:${userId}`
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

export function readStoredTerminalPtyOptions(
  userId: string
): TerminalPtyOptions {
  try {
    const value = window.localStorage.getItem(
      getTerminalPtySettingsStorageKey(userId)
    )
    if (!value) return {}

    const options = JSON.parse(value) as Partial<TerminalPtyOptions>

    return normalizeStoredPtyOptions(options)
  } catch {
    return {}
  }
}

export function writeStoredTerminalPtyOptions(
  userId: string,
  options: TerminalPtyOptions
) {
  try {
    window.localStorage.setItem(
      getTerminalPtySettingsStorageKey(userId),
      JSON.stringify(normalizeStoredPtyOptions(options))
    )
  } catch {
    // Terminal launch should still succeed if browser storage is unavailable.
  }
}

function normalizeStoredPtyOptions(
  options: Partial<TerminalPtyOptions>
): TerminalPtyOptions {
  const user = typeof options.user === 'string' ? options.user : undefined
  const cwd = typeof options.cwd === 'string' ? options.cwd : undefined
  const envs =
    options.envs && typeof options.envs === 'object'
      ? Object.fromEntries(
          Object.entries(options.envs).filter(
            ([key, value]) => key && typeof value === 'string'
          )
        )
      : undefined

  return {
    ...(user !== undefined ? { user } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(envs && Object.keys(envs).length > 0 ? { envs } : {}),
  }
}

export function writeStoredTerminalSession(
  userId: string,
  session: StoredTerminalSession
) {
  try {
    window.localStorage.setItem(
      getTerminalSessionStorageKey(userId),
      JSON.stringify(session)
    )
  } catch {
    // Terminal launch should still succeed if browser storage is unavailable.
  }
}

export function clearStoredTerminalSession(userId: string) {
  try {
    window.localStorage.removeItem(getTerminalSessionStorageKey(userId))
  } catch {
    // Best-effort cleanup for unavailable or blocked browser storage.
  }
}
