// Shared OAuth provider logos. Thin wrappers over the svgl shadcn registry
// icons in `@/components/ui/svgs` (added via `bunx shadcn@latest add
// @svgl/google @svgl/github`), adding our button sizing, a11y, and GitHub's
// light/dark toggle. Used by both the legacy direct-OAuth buttons
// (`oauth-provider-buttons.tsx`) and the Ory login flow's SSO button
// (`src/app/login/components/custom-sso-button.tsx`).
export { GitHubLogo } from './github-logo'
export { GoogleLogo } from './google-logo'
