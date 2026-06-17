import type { OryClientConfiguration } from '@ory/elements-react'
import { PROTECTED_URLS } from '@/configs/urls'

// `sdk.url` must be the app's own origin so the Elements client's
// /self-service/* calls stay same-origin (Kratos' wildcard CORS rejects
// credentialed cross-origin requests); the real origin is injected per-request
// in the flow pages, this env value is only a server-side fallback.
const oryConfig: OryClientConfiguration = {
  sdk: {
    url: process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL,
  },
  project: {
    name: 'E2B',
    hide_ory_branding: true,
    default_redirect_url: PROTECTED_URLS.DASHBOARD,
    error_ui_url: '/login',
    login_ui_url: '/login',
    registration_enabled: true,
    registration_ui_url: '/registration',
    recovery_enabled: true,
    recovery_ui_url: '/recovery',
    verification_enabled: true,
    verification_ui_url: '/verification',
    settings_ui_url: PROTECTED_URLS.ACCOUNT_SETTINGS,
  },
}

export default oryConfig
