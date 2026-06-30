import { getBrowserCookie, setBrowserCookie } from '@/lib/utils/browser-cookies'
import {
  TERMINAL_PTY_SETTINGS_COOKIE_PREFIX,
  TERMINAL_SESSION_STORAGE_PREFIX,
} from './constants'
import type { TerminalPtyOptions } from './pty-options'
import { normalizeTerminalTemplate } from './template'
import type { StoredTerminalSession } from './types'

function getTerminalSessionStorageKey(userId: string) {
  return `${TERMINAL_SESSION_STORAGE_PREFIX}:${userId}`
}

function getTerminalPtySettingsCookieKey(userId: string) {
  return `${TERMINAL_PTY_SETTINGS_COOKIE_PREFIX}:${userId}`
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
    const value = getBrowserCookie(getTerminalPtySettingsCookieKey(userId))
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
    setBrowserCookie(
      getTerminalPtySettingsCookieKey(userId),
      JSON.stringify(normalizeStoredPtyOptions(options))
    )
  } catch {
    // Terminal launch should still succeed if browser cookies are unavailable.
  }
}

function normalizeStoredPtyOptions(
  options: Partial<TerminalPtyOptions>
): TerminalPtyOptions {
  const user = typeof options.user === 'string' ? options.user : undefined
  const cwd = typeof options.cwd === 'string' ? options.cwd : undefined

  return {
    ...(user !== undefined ? { user } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
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
