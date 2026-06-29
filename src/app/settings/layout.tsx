import { ALLOW_SEO_INDEXING } from '@/configs/env-flags'
import { METADATA } from '@/configs/metadata'
import { AUTH_URLS } from '@/configs/urls'
import { buttonVariants } from '@/ui/primitives/button'

export const metadata = {
  title: METADATA.title,
  description: METADATA.description,
  robots: ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow',
}

// Shell-less: no sidebar/team chrome, so the page renders with only a Kratos
// session (the post-recovery password reset has no e2b_session yet).
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="bg-bg/40 sticky top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-4 backdrop-blur-md md:px-6">
        <h1 className="truncate">Account</h1>
        <a
          href={`${AUTH_URLS.SIGN_OUT}?return_to=${encodeURIComponent(AUTH_URLS.SIGN_IN)}`}
          className={`${buttonVariants({ variant: 'secondary' })} shrink-0`}
        >
          Sign out
        </a>
      </header>
      <div className="flex w-full flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  )
}
