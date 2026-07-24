import { PROTECTED_URLS } from './urls'

export const TAB_URL_MAP: Record<string, (teamSlug: string) => string> = {
  sandboxes: (teamSlug) => PROTECTED_URLS.SANDBOXES(teamSlug),
  templates: (teamSlug) => PROTECTED_URLS.TEMPLATES(teamSlug),
  usage: (teamSlug) => PROTECTED_URLS.USAGE(teamSlug),
  billing: (teamSlug) => PROTECTED_URLS.BILLING(teamSlug),
  limits: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
  keys: (teamSlug) => PROTECTED_URLS.KEYS(teamSlug),
  settings: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  team: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  project: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  general: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  members: (teamSlug) => PROTECTED_URLS.MEMBERS(teamSlug),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,

  budget: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
}
