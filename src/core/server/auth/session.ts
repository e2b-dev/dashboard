import type { SignOutOptions } from './session-provider'
import { getSelectedAuthSessionProvider } from './session-selector'

export type { AuthContext } from './session-provider'
export { MissingAuthSessionError } from './session-provider'

export function getAuthContext() {
  return getSelectedAuthSessionProvider().getAuthContext()
}

export function requireAuthContext() {
  return getSelectedAuthSessionProvider().requireAuthContext()
}

export function getAccessToken() {
  return getSelectedAuthSessionProvider().getAccessToken()
}

export function signOut(options?: SignOutOptions) {
  return getSelectedAuthSessionProvider().signOut(options)
}
