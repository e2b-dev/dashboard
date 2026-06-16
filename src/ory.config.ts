import type { OryClientConfiguration } from '@ory/elements-react'

// Single source of truth for the @ory/nextjs proxy + flow getters and the
// @ory/elements-react UI. The *_ui_url values are same-origin paths: the proxy
// rewrites Kratos' SDK-based UI URLs (e.g. ${sdk_url}/login) to <visitingOrigin>
// + these paths, which is what keeps the flow on previews instead of bouncing
// to the canonical auth domain. They double as the in-card link targets
// (e.g. the "Sign up" link on the login card → registration_ui_url).
const oryConfig: OryClientConfiguration = {
  project: {
    name: 'E2B',
    default_redirect_url: '/dashboard',
    error_ui_url: '/error',
    login_ui_url: '/login',
    registration_ui_url: '/registration',
    recovery_ui_url: '/recovery',
    verification_ui_url: '/verification',
    settings_ui_url: '/settings',
    registration_enabled: true,
    recovery_enabled: true,
    verification_enabled: true,
  },
}

export default oryConfig
