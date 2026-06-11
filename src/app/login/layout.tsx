import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { METADATA } from '@/configs/metadata'
import { cn } from '@/lib/utils'
import { GridPattern } from '@/ui/grid-pattern'

// Dedicated layout for the custom Ory login page. Mirrors the (auth) group's
// background/centering, but omits its inner card wrapper: @ory/elements-react's
// <Login> renders its own self-contained card, so wrapping it again would
// double the border and overflow the narrow container.
//
// This route lives outside the (auth) group on purpose. A literal `auth/`
// folder cannot coexist with the (auth) group's internal `auth/` segment (used
// by /auth/cli) — Next.js rejects it as two parallel pages on the same path —
// so the custom login UI is served at the top-level /login instead.
export const metadata = {
  title: METADATA.title,
  description: METADATA.description,
  openGraph: METADATA.openGraph,
  twitter: METADATA.twitter,
  robots: ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow',
}

export default function OryLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        strokeDasharray={'4 2'}
        className={cn(
          '[mask-image:radial-gradient(800px_400px_at_center,white,transparent)]',
          'z-10'
        )}
        gradientFrom="var(--accent-main-highlight )"
        gradientVia="var(--bg-highlight)"
        gradientTo="var(--fill-highlight)"
        gradientDegrees={90}
      />
      <div className="z-10 flex w-full flex-1 items-center justify-center px-4 py-4">
        <div className="w-full max-w-96">{children}</div>
      </div>
    </div>
  )
}
