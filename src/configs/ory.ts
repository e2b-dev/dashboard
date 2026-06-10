import type { OryClientConfiguration } from '@ory/elements-react'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'

// Configuration for the custom Ory self-service UI rendered with
// @ory/elements-react. The dashboard serves the login (/login) and registration
// (/register) flows; the remaining self-service flows (recovery, verification,
// settings) stay on the Ory/Kratos hosted UI, so those *_ui_url values are only
// used for the in-card links and are left disabled/hidden here.
//
// NOTE on `sdk.url`: the Elements client builds its SDK base path from this
// value (`sdk.url + "/self-service/..."`). It MUST be the app's own origin so
// those browser calls stay same-origin and flow through the proxy in
// src/proxy.ts — pointing it straight at Kratos makes the browser call Kratos
// cross-origin, which Kratos' wildcard CORS rejects for credentialed requests.
// The real per-request origin is injected in src/app/login/page.tsx; the
// env-derived value here is only a server-side fallback. @ory/nextjs reads
// NEXT_PUBLIC_ORY_SDK_URL directly (not this config) for its server-side flow
// fetch and as the proxy's upstream Kratos target.
const oryConfig: OryClientConfiguration = {
  sdk: {
    url: process.env.NEXT_PUBLIC_ORY_SDK_URL,
  },
  project: {
    name: 'E2B',
    hide_ory_branding: true,
    default_redirect_url: PROTECTED_URLS.DASHBOARD,
    error_ui_url: AUTH_URLS.SIGN_IN,
    login_ui_url: '/login',
    registration_enabled: true,
    registration_ui_url: '/register',
    // Remaining flows are not yet rendered with Elements — hide their in-card
    // links. Flip these on as those flows are migrated.
    recovery_enabled: false,
    recovery_ui_url: AUTH_URLS.FORGOT_PASSWORD,
    verification_enabled: false,
    verification_ui_url: AUTH_URLS.SIGN_IN,
    settings_ui_url: PROTECTED_URLS.ACCOUNT_SETTINGS,
  },
}

export default oryConfig
