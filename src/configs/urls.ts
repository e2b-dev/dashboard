export const PROTECTED_URLS = {
  SANDBOXES: '/sandboxes',

  SANDBOX: (sandboxId: string) => `/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_MONITORING: (sandboxId: string) =>
    `/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_LOGS: (sandboxId: string) => `/sandboxes/${sandboxId}/logs`,
  SANDBOX_TERMINAL: (sandboxId: string) => `/sandboxes/${sandboxId}/terminal`,
  SANDBOX_FILESYSTEM: (sandboxId: string) =>
    `/sandboxes/${sandboxId}/filesystem`,

  TEMPLATES: '/templates/list',
  TEMPLATES_LIST: '/templates/list',
  TEMPLATES_BUILDS: '/templates/builds',
  TEMPLATE_OVERVIEW: (templateId: string) =>
    `/templates/${templateId}/overview`,
  TEMPLATE_DETAIL_BUILDS: (templateId: string) =>
    `/templates/${templateId}/builds`,
  TEMPLATE_TAGS: (templateId: string) => `/templates/${templateId}/tags`,
  TEMPLATE_TAG_HISTORY: (templateId: string, tag: string) =>
    `/templates/${templateId}/tags/${encodeURIComponent(tag)}`,
  TEMPLATE_BUILD: (templateId: string, buildId: string) =>
    `/templates/${templateId}/builds/${buildId}`,
}

/**
 * Route prefixes gated by the api-key proxy. Anything outside these (and `/`)
 * is public.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  '/sandboxes',
  '/templates',
]

export const SIGN_OUT_URL = '/api/sign-out'

export const HELP_URLS = {
  BUILD_TEMPLATE:
    'https://e2b.dev/docs/sandbox-template#4-build-your-sandbox-template',
  START_COMMAND: 'https://e2b.dev/docs/sandbox-template/start-cmd',
}

export const BASE_URL = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
    ? 'https://e2b.dev'
    : `https://${process.env.VERCEL_BRANCH_URL}`
  : 'http://localhost:3000'

export const GITHUB_URL = 'https://github.com/e2b-dev'
