import { PROTECTED_URLS } from './urls'

/**
 * Maps `/?tab=<tab>` query values to dashboard URLs.
 *
 * These `?tab=` links are NOT legacy: they are stable public entrypoints used
 * to crosslink into the dashboard from outside (docs, the CLI, etc.).
 */
export const TAB_URL_MAP: Record<string, string> = {
  sandboxes: PROTECTED_URLS.SANDBOXES,
  templates: PROTECTED_URLS.TEMPLATES,
}
