import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { METADATA } from '@/configs/metadata'
import { cn } from '@/lib/utils'
import { GridPattern } from '@/ui/grid-pattern'

// Dedicated layout for the custom Ory registration page. Mirrors /login's
// layout (grid background + centering, no inner card wrapper since
// @ory/elements-react renders its own self-contained card). Registration lives
// at the top-level /register because the legacy (auth) group already owns
// /sign-up.
export const metadata = {
  title: METADATA.title,
  description: METADATA.description,
  openGraph: METADATA.openGraph,
  twitter: METADATA.twitter,
  robots: ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow',
}

export default function OryRegistrationLayout({
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
