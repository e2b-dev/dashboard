import { Google } from '@/components/ui/svgs/google'

// Thin wrapper over the svgl registry icon (added via
// `bunx shadcn@latest add @svgl/google`), pinning our button sizing + a11y.
// A single multicolor mark that reads on either theme.
export function GoogleLogo() {
  return <Google className="h-5 w-5" aria-hidden="true" focusable="false" />
}
