import { redirect } from 'next/navigation'
import type { Metadata } from 'next/types'
import { TAB_URL_MAP } from '@/configs/dashboard-tab-url-map'
import { METADATA } from '@/configs/metadata'
import { PROTECTED_URLS } from '@/configs/urls'
import { getApiKey } from '@/core/server/auth'
import { cn } from '@/lib/utils'
import { GridPattern } from '@/ui/grid-pattern'
import { ApiKeyForm } from './api-key-form'

export const metadata: Metadata = {
  title: METADATA.title,
  description: METADATA.description,
  robots: 'noindex, nofollow',
}

type PageProps = {
  searchParams: Promise<{ tab?: string; returnTo?: string }>
}

function resolveDestination(tab?: string, returnTo?: string): string {
  if (tab && TAB_URL_MAP[tab]) return TAB_URL_MAP[tab]
  // Only relative in-app destinations are allowed; anything else falls back.
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) return returnTo
  return PROTECTED_URLS.SANDBOXES
}

export default async function RootPage({ searchParams }: PageProps) {
  const { tab, returnTo } = await searchParams
  const destination = resolveDestination(tab, returnTo)

  const apiKey = await getApiKey()
  if (apiKey) {
    redirect(destination)
  }

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
        <div className="h-fit w-full max-w-96 border bg-bg p-6">
          <ApiKeyForm destination={destination} />
        </div>
      </div>
    </div>
  )
}
