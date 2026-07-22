import { PROTECTED_URLS } from './urls'

/**
 * Maps `?tab=<tab>` query values to dashboard URLs.
 *
 * These `?tab=` links are NOT legacy: they are stable public entrypoints used
 * to crosslink into the dashboard from outside (docs, the CLI, etc.).
 */
export const TAB_URL_MAP: Record<string, (teamSlug: string) => string> = {
  sandboxes: (teamSlug) => PROTECTED_URLS.SANDBOXES(teamSlug),
  templates: (teamSlug) => PROTECTED_URLS.TEMPLATES(teamSlug),
}
