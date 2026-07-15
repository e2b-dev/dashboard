import { PROTECTED_URLS } from './urls'

/**
 * Maps `/dashboard?tab=<tab>` query values to team-scoped dashboard URLs.
 *
 * These `?tab=` links are NOT legacy: they are stable public entrypoints used
 * to crosslink into the dashboard from outside (emails, docs, the CLI, etc.).
 * They must keep working forever — do not remove tabs or change this contract
 * without coordinating with the places that link here.
 */
export const TAB_URL_MAP: Record<string, (teamSlug: string) => string> = {
  sandboxes: (teamSlug) => PROTECTED_URLS.SANDBOXES(teamSlug),
  templates: (teamSlug) => PROTECTED_URLS.TEMPLATES(teamSlug),
  usage: (teamSlug) => PROTECTED_URLS.USAGE(teamSlug),
  billing: (teamSlug) => PROTECTED_URLS.BILLING(teamSlug),
  limits: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
  keys: (teamSlug) => PROTECTED_URLS.KEYS(teamSlug),
  settings: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  team: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  general: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  members: (teamSlug) => PROTECTED_URLS.MEMBERS(teamSlug),
  connections: (teamSlug) => PROTECTED_URLS.CONNECTIONS(teamSlug),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  terminal: (teamSlug) => PROTECTED_URLS.TERMINAL(teamSlug),
  budget: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
}
