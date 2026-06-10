import { GithubDark } from '@/components/ui/svgs/githubDark'
import { GithubLight } from '@/components/ui/svgs/githubLight'

// GitHub's mark is monochrome, so the svgl registry (added via
// `bunx shadcn@latest add @svgl/github`) ships light/dark variants. We render
// both and toggle with Tailwind's `dark:` variant (class strategy, see
// styles/theme.css) so there's no theme-flash and no client JS. The hidden
// variant is `display:none`, so it doesn't affect the button's flex `gap`.
//
// GithubLight is the dark mark (shown in light mode); GithubDark is the light
// mark (shown in dark mode).
export function GitHubLogo() {
  return (
    <>
      <GithubLight
        className="h-5 w-5 dark:hidden"
        aria-hidden="true"
        focusable="false"
      />
      <GithubDark
        className="hidden h-5 w-5 dark:block"
        aria-hidden="true"
        focusable="false"
      />
    </>
  )
}
