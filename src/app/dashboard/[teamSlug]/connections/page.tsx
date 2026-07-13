import type { Metadata } from 'next'
import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import { Page } from '@/features/dashboard/layouts/page'
import { ArrowRightIcon, TerminalIcon } from '@/ui/primitives/icons'

export const metadata: Metadata = {
  title: 'Connections - E2B',
}

interface ConnectionsPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function ConnectionsPage({
  params,
}: ConnectionsPageProps) {
  const { teamSlug } = await params

  return (
    <Page>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="prose-title text-fg">Connections</h1>
          <p className="prose-body text-fg-tertiary max-w-2xl">
            Connect services that run workloads in your E2B team.
          </p>
        </header>

        <div className="border-stroke border-y">
          <Link
            className="hover:bg-bg-hover focus-visible:outline-accent-main-highlight flex min-h-24 items-center gap-4 px-3 py-4 outline-none transition-colors md:px-4"
            href={PROTECTED_URLS.CONNECTION_DEVIN(teamSlug)}
          >
            <div className="border-stroke bg-bg-1 flex size-11 shrink-0 items-center justify-center border">
              <TerminalIcon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="prose-body-highlight text-fg">Devin</h2>
                <span className="prose-label text-fg-tertiary border-stroke border px-1.5 py-0.5 uppercase">
                  Outposts
                </span>
              </div>
              <p className="prose-body text-fg-tertiary mt-1">
                Run Devin sessions on workers isolated in E2B sandboxes.
              </p>
            </div>
            <span className="prose-label-highlight text-fg-secondary hidden items-center gap-1 sm:flex">
              Configure
              <ArrowRightIcon className="size-4" aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </Page>
  )
}
