import type { Metadata } from 'next'
import { DevinConnectionForm } from '@/features/dashboard/connections/devin-connection-form'
import { Page } from '@/features/dashboard/layouts/page'

export const metadata: Metadata = {
  title: 'Devin connection - E2B',
  robots: 'noindex, nofollow',
}

interface DevinConnectionPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function DevinConnectionPage({
  params,
}: DevinConnectionPageProps) {
  const { teamSlug } = await params

  return (
    <Page>
      <DevinConnectionForm teamSlug={teamSlug} />
    </Page>
  )
}
